# https://jacks.tsundoku.io/

<a href="https://jacks.tsundoku.io"><img src="https://github.com/chromy/images/blob/main/jacks-cover.jpg" width="256" height="256"></a>

[Jack's gelato](https://www.jacksgelato.com/) is the best ice-cream shop
in Cambridge, UK - but it's not the *only* ice-cream shop in Cambridge.

On the other hand https://jacks.tsundoku.io/ is both the best API for
Jack's gelato *and* the only API for Jack's gelato - so which are you
eating when push come to shove?

## Usage

```bash
$ curl https://jacks.tsundoku.io/
{
  "locations": [
    {
      "flavours": [
        {
          "name": "Vanilla",
          "isVegan": false
        },
        {
          "name": "White Miso & Manuka Honey",
          "isVegan": false
        },
        {
          "name": "Mascarpone & Raspberry Cake",
          "isVegan": false
        },
        {
          "name": "Honeycomb",
          "isVegan": false
        },
        {
          "name": "Chocolate",
          "isVegan": false
        },
        {
          "name": "Passionfruit & Basil Sorbet",
          "isVegan": true
        },
        {
          "name": "Mint Stracciatella",
          "isVegan": false
        },
        {
          "name": "Dark Chocolate & Sea Salt",
          "isVegan": true
        },
        {
          "name": "Roasted Hazelnut",
          "isVegan": false
        },
        {
          "name": "Strawberry",
          "isVegan": false
        },
        {
          "name": "Coconut & Ube",
          "isVegan": true
        },
        {
          "name": "Saragusta Gin & Tonic Sorbet",
          "isVegan": true
        }
      ],
      "currentMenuUrl": "https://docs.google.com/document/d/1dVYB7lnBgWE0bPhc9SFz0aLrkDfSCulrMctW1gDfCA8/export?format=pdf",
      "name": "Bene't Street"
    },
    {
      "flavours": [
        {
          "name": "Hazelnut & Honeycomb",
          "isVegan": false
        },
        {
          "name": "Malted Milk Chocolate",
          "isVegan": false
        },
        {
          "name": "Strawberry",
          "isVegan": false
        },
        {
          "name": "Lychee Sorbet",
          "isVegan": true
        },
        {
          "name": "Blackcurrant",
          "isVegan": false
        },
        {
          "name": "Mascarpone",
          "isVegan": false
        },
        {
          "name": "Coconut & Lemongrass",
          "isVegan": true
        },
        {
          "name": "Ube",
          "isVegan": false
        },
        {
          "name": "Alphonso Mango Sorbet",
          "isVegan": true
        },
        {
          "name": "House Yoghurt",
          "isVegan": false
        }
      ],
      "currentMenuUrl": "https://docs.google.com/document/d/1kDBSxPb8X4L2TKXWUmm2A-VGuPVTyxmfbq9iwUQQ2nc/export?format=pdf",
      "name": "All Saints Passage"
    }
  ],
  "retrievedAt": "2024-07-27T18:41:24.854Z",
  "version": 1
}
```

