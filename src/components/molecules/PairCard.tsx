import { styled } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import type { Ingredient, Partner, Tag } from "../../types";
import { IngredientImg } from "./IngredientVisual";

const Root = styled(Card)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "0 2px 12px rgba(70,45,20,.06)",
  transition: "transform .15s, border-color .15s, box-shadow .15s",
  "&:hover": {
    transform: "translateY(-3px)",
    borderColor: "rgba(70,45,20,.3)",
    boxShadow: "0 8px 24px rgba(70,45,20,.12)",
  },
  "&:hover .pair-img": {
    transform: "scale(1.07)",
  },
}));

const Inner = styled(CardActionArea)({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
});

/* full-width illustration banner, the star of the card */
const Figure = styled("div")(({ theme }) => ({
  position: "relative",
  aspectRatio: "1 / 1",
  overflow: "hidden",
  // slightly lighter than the page cream, but not white
  backgroundColor: "#fbf8eb",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const Body = styled("div")(({ theme }) => ({
  padding: theme.spacing(1.6, 2, 1.8),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.9),
  width: "100%",
}));

/* name on the left, score on the right, same serif voice */
const TitleRow = styled("div")({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
});

const Name = styled("span")(({ theme }) => ({
  fontFamily: "'Fraunces', serif",
  fontWeight: 550,
  fontSize: 21,
  lineHeight: 1.15,
  color: theme.palette.text.primary,
  textTransform: "capitalize",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

/* quiet one-line aroma summary: "Bitter · Yeast · Baked" */
const TagLine = styled("span")(({ theme }) => ({
  fontSize: 12.5,
  color: theme.palette.text.secondary,
  textTransform: "capitalize",
  minHeight: 19,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));

const Facts = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.9),
  fontSize: 12,
  color: theme.palette.text.secondary,
  "& .r": { color: theme.palette.secondary.main, fontWeight: 700 },
  "& .m": { color: theme.palette.primary.main, fontWeight: 700 },
  "& .sep": { color: theme.palette.divider },
}));

export function PairCard({
  ing,
  partner,
  tags,
  onOpen,
}: {
  ing: Ingredient;
  partner: Partner;
  tags: Tag[];
  onOpen: () => void;
}) {
  return (
    <Root>
      <Inner onClick={onOpen} disableRipple aria-label={`Pairing with ${ing.en}`}>
        <Figure>
          <IngredientImg
            ing={ing}
            className="pair-img"
            sizes="(max-width: 600px) 45vw, 230px"
            spinnerSize={24}
          />
        </Figure>
        <Body>
          <TitleRow>
            <Name>{ing.en}</Name>
          </TitleRow>
          <TagLine>
            {partner.tags.slice(0, 3).map((t) => tags[t].en).join(" · ")}
          </TagLine>
          <Facts>
            <span className="r">{partner.cooc.toLocaleString("en-US")} recipes</span>
            <span className="sep">·</span>
            <span className="m">{partner.nShared} molecules</span>
          </Facts>
        </Body>
      </Inner>
    </Root>
  );
}
