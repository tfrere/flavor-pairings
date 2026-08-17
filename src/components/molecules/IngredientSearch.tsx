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
      onOpen={warmUp}
      popupIcon={<ExpandMoreRoundedIcon />}
      noOptionsText={
        input.trim().length < 2
          ? "Type at least 2 characters"
          : "No ingredient found"
      }
      slotProps={{
        paper: {
          sx: {
            mt: 1.25,
            borderRadius: "16px",
            border: 1,
            borderColor: "divider",
            boxShadow: "0 16px 40px rgba(70,45,20,.14)",
            overflow: "hidden",
          },
        },
        listbox: {
          sx: {
            py: 1,
            "& .MuiAutocomplete-option": {
              px: 2,
              py: 1.1,
              mx: 1,
              borderRadius: "10px",
              '&[aria-selected="true"], &.Mui-focused, &:hover': {
                bgcolor: "#f7f1de",
              },
            },
          },
        },
      }}
      sx={{
        // real chevron, breathing room from the right edge, no flip jump
        "& .MuiAutocomplete-endAdornment": { right: 20 },
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
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", flexShrink: 0 }}>
            {o.ing.nrec.toLocaleString("en-US")} recipes
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
                  <Tooltip title="Loading multilingual semantic search…">
                    <CircularProgress size={18} />
                  </Tooltip>
                </InputAdornment>
              ) : (
                params.InputProps.endAdornment
              ),
              sx: { borderRadius: 99, bgcolor: "background.paper", pl: 2.5, pr: 3, py: 0.5 },
            },
          }}
        />
      )}
    />
  );
}
