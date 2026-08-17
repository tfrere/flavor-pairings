import { useEffect, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Ingredient } from "../../types";
import { IngredientVisual } from "./IngredientVisual";
import { preload, isReady, semanticRank } from "../../semanticSearch";

interface Option {
  ing: Ingredient;
  index: number;
}

const MAX_RESULTS = 6;

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Substring fallback used while the embedding model is still loading. */
function fuzzy(ingredients: Ingredient[], q: string): Option[] {
  return ingredients
    .map((ing, index) => ({ ing, index }))
    .filter((o) => strip(o.ing.en).includes(q) || strip(o.ing.fr).includes(q))
    .sort((x, y) => {
      const xs = strip(x.ing.en).startsWith(q) ? 0 : 1;
      const ys = strip(y.ing.en).startsWith(q) ? 0 : 1;
      return xs - ys || y.ing.nrec - x.ing.nrec;
    })
    .slice(0, MAX_RESULTS);
}

export function IngredientSearch({
  ingredients,
  onSelect,
}: {
  ingredients: Ingredient[];
  onSelect: (index: number) => void;
}) {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [semantic, setSemantic] = useState(isReady());
  const [loading, setLoading] = useState(false);
  // popup state drives the "glued" look: the input flattens the corners on
  // the side the dropdown opens from
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const queryId = useRef(0);

  const warmUp = () => {
    if (isReady()) return;
    setLoading(true);
    preload()
      .then(() => setSemantic(true))
      .catch(() => {}) // fuzzy fallback keeps working
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const q = strip(input.trim());
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    const id = ++queryId.current;

    if (!isReady()) {
      setOptions(fuzzy(ingredients, q));
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { ranked, margin } = await semanticRank(input.trim());
        if (id !== queryId.current) return;
        const top1 = ranked[0]?.sim ?? 0;
        const picked = ranked
          .map(({ index, sim }) => {
            const ing = ingredients[index];
            // literal matches still win over pure semantic neighbors
            const boost = strip(ing.en).startsWith(q) || strip(ing.fr).startsWith(q)
              ? 0.3
              : strip(ing.en).includes(q) || strip(ing.fr).includes(q)
                ? 0.15
                : 0;
            return { index, sim, boost, score: sim + boost };
          })
          // out-of-vocabulary queries produce uniformly high background
          // similarity: only trust rankings whose best hit stands out
          .filter((s) => s.boost > 0 || (margin >= 0.3 && s.sim >= top1 - 0.1))
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_RESULTS)
          .map(({ index }) => ({ ing: ingredients[index], index }));
        setOptions(picked);
      } catch {
        if (id === queryId.current) setOptions(fuzzy(ingredients, q));
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [input, ingredients, semantic]);

  return (
    <Autocomplete<Option>
      options={options}
      getOptionLabel={(o) => o.ing.en}
      filterOptions={(x) => x}
      onChange={(_, value) => {
        if (value) {
          onSelect(value.index);
          setInput("");
        }
      }}
      onInputChange={(_, value, reason) => {
        // only track real typing; "reset" events fire on re-renders and would
        // wipe the query while the user is typing
        if (reason === "input" || reason === "clear") setInput(value);
      }}
      inputValue={input}
      value={null}
      blurOnSelect
      clearOnBlur
      onOpen={() => { warmUp(); setOpen(true); }}
      onClose={() => setOpen(false)}
      popupIcon={<ExpandMoreRoundedIcon />}
      noOptionsText={
        input.trim().length < 2
          ? "Type at least 2 characters"
          : "No ingredient found"
      }
      slotProps={{
        popper: {
          modifiers: [
            {
              // mirror the actual popper placement into React state so the
              // input can flatten the matching corners
              name: "reportPlacement",
              enabled: true,
              phase: "afterWrite" as const,
              fn: ({ state }: { state: { placement: string } }) => {
                setPlacement(state.placement.startsWith("top") ? "top" : "bottom");
              },
            },
          ],
        },
        paper: {
          sx: {
            borderRadius: "16px",
            border: 1,
            borderColor: "divider",
            overflow: "hidden",
            // glue the panel to the search bar on the shared edge
            '[data-popper-placement*="bottom"] &': {
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderTop: 0,
              boxShadow: "0 16px 40px rgba(70,45,20,.14)",
            },
            '[data-popper-placement*="top"] &': {
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderBottom: 0,
              boxShadow: "0 -16px 40px rgba(70,45,20,.14)",
            },
          },
        },
        listbox: {
          sx: {
            py: 0,
            "& .MuiAutocomplete-option": {
              pl: 1.25,
              pr: 2.5,
              py: 1.1,
              '&[aria-selected="true"], &.Mui-focused, &:hover': {
                bgcolor: "#f7f1de",
              },
              "& + .MuiAutocomplete-option": {
                borderTop: "1px solid",
                borderTopColor: "divider",
              },
            },
          },
        },
      }}
      sx={{
        // real chevron, breathing room from the right edge, no flip jump.
        // !important: Autocomplete's own inputRoot/endAdornment rules have
        // higher specificity than sx-generated classes and win otherwise
        "& .MuiAutocomplete-endAdornment": { right: "28px !important" },
        "& .MuiAutocomplete-inputRoot": {
          paddingLeft: "28px !important",
          paddingRight: "64px !important",
        },
        "& .MuiAutocomplete-popupIndicator": {
          color: "text.secondary",
          transition: "transform .2s",
        },
      }}
      renderOption={(props, o) => (
        <Box
          component="li"
          {...props}
          key={o.index}
          sx={{ display: "flex", gap: 1.75, alignItems: "center" }}
        >
          <IngredientVisual ing={o.ing} size={46} round={false} />
          <Typography
            sx={{
              flex: 1,
              fontFamily: "'Fraunces', serif",
              fontSize: 17.5,
              fontWeight: 550,
              textTransform: "capitalize",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {o.ing.en}
          </Typography>
          <Typography sx={{ fontSize: 12.5, flexShrink: 0 }}>
            <Box component="span" sx={{ color: "secondary.main", fontWeight: 600 }}>
              {o.ing.nrec.toLocaleString("en-US")} recipes
            </Box>
            <Box component="span" sx={{ color: "divider", mx: 0.7 }}>·</Box>
            <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
              {o.ing.nmol} molecules
            </Box>
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search in any language… (strawberry, fraise, fresa)"
          aria-label="Search an ingredient"
          onFocus={warmUp}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="disabled" />
                </InputAdornment>
              ),
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <Tooltip title="Loading search index…">
                    <CircularProgress size={18} />
                  </Tooltip>
                </InputAdornment>
              ) : (
                params.InputProps.endAdornment
              ),
              sx: {
                borderRadius: open
                  ? placement === "bottom"
                    ? "28px 28px 0 0"
                    : "0 0 28px 28px"
                  : "99px",
                bgcolor: "background.paper",
                py: 0.5,
              },
            },
          }}
        />
      )}
    />
  );
}
