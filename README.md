# https://jacks.tsundoku.io/

<a href="https://d3js.org"><img src="https://raw.githubusercontent.com/d3/d3/main/docs/public/logo.svg" width="256" height="256"></a>

[Jack's gelato](https://www.jacksgelato.com/) is the best ice-cream shop
in Cambridge, UK - but it's not the *only* ice-cream shop in Cambridge.

On the other hand https://jacks.tsundoku.io/ is both the best API for
Jack's gelato *and* the only API for Jack's gelato - so which are you
eating when push come to shove.

## Usage

```bash
$ curl https://jacks.tsundoku.io/
{
  "flavours": [
    {
      "name": "Chocolate Chip Cookie Dough",
      "isVegan": false
    },
    {
      "name": "Yuzu Sorbet",
      "isVegan": true
    },
    {
      "name": "Chocolate & Rose",
      "isVegan": false
    },
    {
      "name": "Blackcurrants & Cream",
      "isVegan": false
    },
    {
      "name": "Coconut, Ube & Whole Cardamom Seed",
      "isVegan": true
    },
    {
      "name": "Vanilla",
      "isVegan": false
    },
    {
      "name": "Strawberry",
      "isVegan": false
    },
    {
      "name": "Alphonso Mango Sorbet",
      "isVegan": true
    },
    {
      "name": "Dark Chocolate & Sea Salt",
      "isVegan": true
    },
    {
      "name": "House Yoghurt",
      "isVegan": false
    }
  ],
  "retrievedAt": "2024-07-13T19:09:40.240Z"
}
```

