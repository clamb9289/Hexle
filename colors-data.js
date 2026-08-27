// Pixel-sampled from a user-supplied reference gradient image (16 cols x 30 rows).
// Each hex is the EXACT sampled pixel color; each name is a UNIQUE closest match
// from a 31,915-color public name database (meodai/color-names) -- deduplicated
// so no two cells share a name, falling back to the next-closest name on collision.
const COLORS = [
{
"name": "Purple Sapphire",
"hex": "#724198"
},
{
"name": "Purple Heart",
"hex": "#693D97"
},
{
"name": "Lucid Dreams",
"hex": "#5D3091"
},
{
"name": "Majestic Eggplant",
"hex": "#463089"
},
{
"name": "Cosmic Cobalt",
"hex": "#343083"
},
{
"name": "Ballpoint Indigo",
"hex": "#312E77"
},
{
"name": "Ritterlich Blue",
"hex": "#333284"
},
{
"name": "Navy Seal",
"hex": "#263C93"
},
{
"name": "Cascade Twilight",
"hex": "#28489A"
},
{
"name": "Dazzling Blue",
"hex": "#3251A2"
},
{
"name": "International",
"hex": "#365BAB"
},
{
"name": "Adventure of the Seas",
"hex": "#3665B2"
},
{
"name": "Matt Blue",
"hex": "#2D73B9"
},
{
"name": "Klaxosaur Blue",
"hex": "#2484C6"
},
{
"name": "Structural Blue",
"hex": "#179ED6"
},
{
"name": "Blue Atoll",
"hex": "#0EB0DD"
},
{
"name": "Cadmium Violet",
"hex": "#7B3F97"
},
{
"name": "Shiner",
"hex": "#733E98"
},
{
"name": "Daisy Bush",
"hex": "#663A94"
},
{
"name": "Ruthless Empress",
"hex": "#593694"
},
{
"name": "Galactic Purple",
"hex": "#4A308E"
},
{
"name": "Perfect Dark",
"hex": "#363289"
},
{
"name": "Liquid Denim",
"hex": "#313993"
},
{
"name": "Le Grand Bleu",
"hex": "#2F479B"
},
{
"name": "Blasphemous Blue",
"hex": "#3250A3"
},
{
"name": "Nebulas Blue",
"hex": "#365BA9"
},
{
"name": "Shukra Blue",
"hex": "#3A64B3"
},
{
"name": "Wide Sky",
"hex": "#3D6EB4"
},
{
"name": "Heirloom Hydrangea",
"hex": "#317EC4"
},
{
"name": "Boyzone",
"hex": "#2393D4"
},
{
"name": "Malibu Blue",
"hex": "#06A8DB"
},
{
"name": "Maldives",
"hex": "#03B6D5"
},
{
"name": "Dull Violet",
"hex": "#843E96"
},
{
"name": "Perkin Mauve",
"hex": "#7A3F95"
},
{
"name": "Amaranth Purple",
"hex": "#713F96"
},
{
"name": "Rebecca Purple",
"hex": "#653995"
},
{
"name": "Tyrian Purple",
"hex": "#573593"
},
{
"name": "Royal Wisteria",
"hex": "#4C3492"
},
{
"name": "Galaxy Express",
"hex": "#45439C"
},
{
"name": "Nuthatch Back",
"hex": "#3F51A3"
},
{
"name": "Starstruck",
"hex": "#3C5BAB"
},
{
"name": "Dover Straits",
"hex": "#3A65B1"
},
{
"name": "Athens",
"hex": "#3D6DB4"
},
{
"name": "Mykonos",
"hex": "#387ABD"
},
{
"name": "Magical Merlin",
"hex": "#3C8ECD"
},
{
"name": "Royal Peacock",
"hex": "#1EA4DE"
},
{
"name": "Battery Charged Blue",
"hex": "#0BB3D7"
},
{
"name": "Cala Benirr\u00e1s Blue",
"hex": "#06BDC9"
},
{
"name": "Purple Excellency",
"hex": "#8B3D97"
},
{
"name": "Dahlia",
"hex": "#853F97"
},
{
"name": "Skeletor's Cape",
"hex": "#783E97"
},
{
"name": "Poppy Pompadour",
"hex": "#6A3E98"
},
{
"name": "Sweet Flag",
"hex": "#673F98"
},
{
"name": "Liberty",
"hex": "#5B4199"
},
{
"name": "Blue Ember",
"hex": "#504CA1"
},
{
"name": "Purple Frenzy",
"hex": "#4758A5"
},
{
"name": "Kakitsubata Blue",
"hex": "#4264AD"
},
{
"name": "Waterline Blue",
"hex": "#406DB5"
},
{
"name": "Tufts Blue",
"hex": "#3D7DC0"
},
{
"name": "Casting Sea",
"hex": "#4388C6"
},
{
"name": "Blue Damselfly",
"hex": "#2D9BD8"
},
{
"name": "Blue Fire",
"hex": "#0FAFDB"
},
{
"name": "The Crowd Roars!",
"hex": "#1CBED3"
},
{
"name": "Tiffany Blue",
"hex": "#1ABCB9"
},
{
"name": "Nebula Outpost",
"hex": "#913B97"
},
{
"name": "Evil Curse",
"hex": "#8C3E94"
},
{
"name": "Murasaki Purple",
"hex": "#853F98"
},
{
"name": "Purple Pleasures",
"hex": "#7D4195"
},
{
"name": "Parfait d'Amour",
"hex": "#6D479B"
},
{
"name": "Ultrapurple Merge",
"hex": "#624A9D"
},
{
"name": "Coronation Blue",
"hex": "#5A55A2"
},
{
"name": "Submarine Base",
"hex": "#5661AA"
},
{
"name": "Azraq Blue",
"hex": "#4E6EB4"
},
{
"name": "Parkwater",
"hex": "#477DBE"
},
{
"name": "Blue Sonki",
"hex": "#468AC6"
},
{
"name": "Sorcerer",
"hex": "#3B98D2"
},
{
"name": "Huelve\u00f1o Horizon",
"hex": "#1CA9DF"
},
{
"name": "Bright Cerulean",
"hex": "#15BAD7"
},
{
"name": "Maximum Blue Green",
"hex": "#2ABFC7"
},
{
"name": "Teal",
"hex": "#1DBAAC"
},
{
"name": "Warm Purple",
"hex": "#9E3893"
},
{
"name": "Plum Pie",
"hex": "#973F95"
},
{
"name": "Cosmic Berry",
"hex": "#8C449B"
},
{
"name": "Voodoo Violet",
"hex": "#834396"
},
{
"name": "Studio",
"hex": "#7B499C"
},
{
"name": "Royal Lavender",
"hex": "#7251A3"
},
{
"name": "Blue Marguerite",
"hex": "#695EAD"
},
{
"name": "Loch Ness",
"hex": "#5C6AB2"
},
{
"name": "Lumpy Cerulean Sweater Blue",
"hex": "#5679B9"
},
{
"name": "Berlin Blue",
"hex": "#528CCA"
},
{
"name": "Waimea Blue",
"hex": "#529DD7"
},
{
"name": "Thalassophile",
"hex": "#40ABE2"
},
{
"name": "Caribbean Blue",
"hex": "#1AB9E1"
},
{
"name": "Holiday Blue",
"hex": "#2FC1CF"
},
{
"name": "Message Green",
"hex": "#30BDB4"
},
{
"name": "Sea Foam Green",
"hex": "#26B9A1"
},
{
"name": "Wild Aster",
"hex": "#A83891"
},
{
"name": "Aged Purple",
"hex": "#A13F99"
},
{
"name": "Viva Magenta",
"hex": "#954398"
},
{
"name": "Vicious Violet",
"hex": "#8B4C9E"
},
{
"name": "Royal Lilac",
"hex": "#8452A3"
},
{
"name": "Sumire Violet",
"hex": "#7C59A5"
},
{
"name": "Genestealer Purple",
"hex": "#7265AE"
},
{
"name": "Wind Star",
"hex": "#6B75B9"
},
{
"name": "Bodega Bay",
"hex": "#6484C3"
},
{
"name": "Winter Lake",
"hex": "#5E96CF"
},
{
"name": "Hoeth Blue",
"hex": "#5DA9D9"
},
{
"name": "Megaman",
"hex": "#3CBCEC"
},
{
"name": "Ocean Sigh",
"hex": "#32C0DA"
},
{
"name": "Panorama Blue",
"hex": "#39C0C3"
},
{
"name": "Melbourne Cup",
"hex": "#40BEAB"
},
{
"name": "Aoife's Green",
"hex": "#2DB898"
},
{
"name": "Fandango",
"hex": "#B33392"
},
{
"name": "Purple Cactus Flower",
"hex": "#A93D93"
},
{
"name": "Medium Purple",
"hex": "#A0469C"
},
{
"name": "Hyacinth Violet",
"hex": "#954E9D"
},
{
"name": "Highlighter Lavender",
"hex": "#8C55A0"
},
{
"name": "Chive Blossom",
"hex": "#875EA5"
},
{
"name": "Plum Preserve",
"hex": "#816DB1"
},
{
"name": "Astro Zinger",
"hex": "#757DBB"
},
{
"name": "Cool Touch",
"hex": "#7093CB"
},
{
"name": "Baja Blue",
"hex": "#65A6DB"
},
{
"name": "Sea Frolic",
"hex": "#60BCE9"
},
{
"name": "Sky Blue",
"hex": "#3BC5EE"
},
{
"name": "Sea Serpent",
"hex": "#46C3CF"
},
{
"name": "Tint of Turquoise",
"hex": "#46C0B5"
},
{
"name": "Jolt of Jade",
"hex": "#4ABD9E"
},
{
"name": "Aztec Jade",
"hex": "#32B88B"
},
{
"name": "Lust Priestess",
"hex": "#BC2F8E"
},
{
"name": "Romantic Rose",
"hex": "#B24098"
},
{
"name": "Plum Dust",
"hex": "#A7499B"
},
{
"name": "Purpureus",
"hex": "#9D50A1"
},
{
"name": "Empire Violet",
"hex": "#955AA5"
},
{
"name": "Knight Elf",
"hex": "#9169AC"
},
{
"name": "Royal Raul",
"hex": "#8B77B8"
},
{
"name": "Pleated Mauve",
"hex": "#8388C3"
},
{
"name": "Perriwinkle",
"hex": "#78A1D7"
},
{
"name": "Life Force",
"hex": "#70B5E3"
},
{
"name": "Skyan",
"hex": "#66CAF7"
},
{
"name": "Naxos Sky",
"hex": "#57C7DF"
},
{
"name": "Port Hope",
"hex": "#56C6C2"
},
{
"name": "Emerald Bliss",
"hex": "#50C0AC"
},
{
"name": "Expressionism Green",
"hex": "#4CBC92"
},
{
"name": "Ming Green",
"hex": "#3ABA7C"
},
{
"name": "Royal Fuchsia",
"hex": "#C92790"
},
{
"name": "Boat Orchid",
"hex": "#BD3D95"
},
{
"name": "Safflower Purple",
"hex": "#B5499C"
},
{
"name": "Orchid Dottyback",
"hex": "#A555A4"
},
{
"name": "Royal Pretender",
"hex": "#9E61A7"
},
{
"name": "Purple Pride",
"hex": "#9B73B2"
},
{
"name": "Bougainvillaea",
"hex": "#9982BD"
},
{
"name": "Litmus",
"hex": "#9694C8"
},
{
"name": "Birdie Num Num",
"hex": "#88AAD8"
},
{
"name": "Fish Pond",
"hex": "#7EC7EE"
},
{
"name": "Heisenberg Blue",
"hex": "#73D0F5"
},
{
"name": "Throat Chakra",
"hex": "#6BCBDB"
},
{
"name": "Bayside",
"hex": "#60C5BA"
},
{
"name": "Peppermint Fresh",
"hex": "#5CC19E"
},
{
"name": "Bleached Olive",
"hex": "#51BC83"
},
{
"name": "Midori Green",
"hex": "#41B86C"
},
{
"name": "Purple Heart Kiwi",
"hex": "#D21C8C"
},
{
"name": "Magenta Pink",
"hex": "#CD3997"
},
{
"name": "Ultraviolet Nusp",
"hex": "#BC4D9D"
},
{
"name": "Magenta Memoir",
"hex": "#B3569F"
},
{
"name": "Victorian Valentine",
"hex": "#AE69AD"
},
{
"name": "Berries Galore",
"hex": "#AA7BB5"
},
{
"name": "Classic Bouquet",
"hex": "#A78AC0"
},
{
"name": "Imperial Lilac",
"hex": "#A79FCD"
},
{
"name": "Honest",
"hex": "#99B7E0"
},
{
"name": "Kul Sharif Blue",
"hex": "#8BD6F6"
},
{
"name": "Pool Tiles",
"hex": "#8AD4ED"
},
{
"name": "Aqua Belt",
"hex": "#7ACCD3"
},
{
"name": "Miami Teal",
"hex": "#6CC5B3"
},
{
"name": "Katydid",
"hex": "#61BF94"
},
{
"name": "Zombie Green",
"hex": "#55BC76"
},
{
"name": "Turtle Warrior",
"hex": "#40B665"
},
{
"name": "Benevolent Pink",
"hex": "#D60F83"
},
{
"name": "Dark Princess Pink",
"hex": "#D82D90"
},
{
"name": "Rose Violet",
"hex": "#C94A9D"
},
{
"name": "Young Purple",
"hex": "#C060A2"
},
{
"name": "Eccentric Magenta",
"hex": "#B76FAC"
},
{
"name": "Lavender Sweater",
"hex": "#BB83BA"
},
{
"name": "Atlantic Tulip",
"hex": "#B798C7"
},
{
"name": "Delicate Lilac",
"hex": "#B2ABD4"
},
{
"name": "Light Steel Blue",
"hex": "#A3C6E7"
},
{
"name": "Sora Blue",
"hex": "#9CDCF3"
},
{
"name": "Jodhpur Blue",
"hex": "#9BD7EA"
},
{
"name": "Water Wonder",
"hex": "#83D1CD"
},
{
"name": "Puppeteers",
"hex": "#77CAAD"
},
{
"name": "Techno Turquoise",
"hex": "#60BF8B"
},
{
"name": "Iridescent Green",
"hex": "#49BB6F"
},
{
"name": "Classic Green",
"hex": "#38B459"
},
{
"name": "Dogwood Rose",
"hex": "#E01172"
},
{
"name": "Fabulous Fuchsia",
"hex": "#E81590"
},
{
"name": "Prunus Avium",
"hex": "#DB4598"
},
{
"name": "Llilacquered",
"hex": "#C9589C"
},
{
"name": "Bishop Red",
"hex": "#C472AD"
},
{
"name": "Rock Star Pink",
"hex": "#C68CBD"
},
{
"name": "Plink",
"hex": "#CEAFD2"
},
{
"name": "Sweet Lucid Dreams",
"hex": "#CBBEDD"
},
{
"name": "Light Powder Blue",
"hex": "#C2D9F1"
},
{
"name": "Azure Sky",
"hex": "#B1E3F6"
},
{
"name": "Geyser Pool",
"hex": "#A9DCE3"
},
{
"name": "Green Daze",
"hex": "#8FD2C5"
},
{
"name": "Gem Silica",
"hex": "#75C5A9"
},
{
"name": "Spearmint Burst",
"hex": "#5BBD86"
},
{
"name": "Esmeralda",
"hex": "#44B970"
},
{
"name": "Vegan Mastermind",
"hex": "#33B658"
},
{
"name": "Purple Yearning",
"hex": "#E21466"
},
{
"name": "Jelly Berry",
"hex": "#EE1379"
},
{
"name": "Cerise Pink",
"hex": "#E93691"
},
{
"name": "Bit of Berry",
"hex": "#DF549C"
},
{
"name": "Sky Magenta",
"hex": "#D673AD"
},
{
"name": "Pressed Flower",
"hex": "#D08CBC"
},
{
"name": "Berry Popsicle",
"hex": "#D1A7CD"
},
{
"name": "Pussyfoot",
"hex": "#CCB7D8"
},
{
"name": "Murano Soft Blue",
"hex": "#C5D8F2"
},
{
"name": "Echo Iris",
"hex": "#B5E1F3"
},
{
"name": "Beachside Drive",
"hex": "#AADBDE"
},
{
"name": "Light Capri Green",
"hex": "#8DD1BE"
},
{
"name": "Intense Jade",
"hex": "#6DC59B"
},
{
"name": "Heart Chakra",
"hex": "#5ABF7D"
},
{
"name": "Artificial Turf",
"hex": "#43B763"
},
{
"name": "Spandex Green",
"hex": "#33B349"
},
{
"name": "Spanish Crimson",
"hex": "#E71C54"
},
{
"name": "Borderline Pink",
"hex": "#EC186C"
},
{
"name": "Pinkinity",
"hex": "#EE3088"
},
{
"name": "Tutuji Pink",
"hex": "#EF4F9E"
},
{
"name": "Amaranth",
"hex": "#E470A9"
},
{
"name": "Tempting Pink",
"hex": "#DF8DBA"
},
{
"name": "Prettiest Pink",
"hex": "#E1A3C7"
},
{
"name": "Lilac Haze",
"hex": "#D9B6D6"
},
{
"name": "Salty Vapour",
"hex": "#C9DDE4"
},
{
"name": "Soaring Sky",
"hex": "#BAE4E4"
},
{
"name": "Jaded Clouds",
"hex": "#ACDDD4"
},
{
"name": "Vile Green",
"hex": "#8DD0AE"
},
{
"name": "Green Gala",
"hex": "#71C596"
},
{
"name": "Acid Sleazebag",
"hex": "#55BC7A"
},
{
"name": "Cool Green",
"hex": "#37B55E"
},
{
"name": "Nordic Grass Green",
"hex": "#20B14C"
},
{
"name": "Red Crayon",
"hex": "#EC1E49"
},
{
"name": "Mellow Melon",
"hex": "#EC1F5E"
},
{
"name": "Amor",
"hex": "#EE3279"
},
{
"name": "Power Peony",
"hex": "#F1528C"
},
{
"name": "Fugitive Flamingo",
"hex": "#EF68A5"
},
{
"name": "Brown Knapweed",
"hex": "#F288B8"
},
{
"name": "Pastel Magenta",
"hex": "#F39DC3"
},
{
"name": "Chantilly",
"hex": "#EEB6C7"
},
{
"name": "Misty Marsh",
"hex": "#D4E1D4"
},
{
"name": "Jade Spell",
"hex": "#C4E5D6"
},
{
"name": "Mint Gala",
"hex": "#AFDBC3"
},
{
"name": "Irish Spring",
"hex": "#93CFA7"
},
{
"name": "Clover Mist",
"hex": "#6CC48A"
},
{
"name": "Emerald Cory",
"hex": "#50BA72"
},
{
"name": "Future Hair",
"hex": "#2EB655"
},
{
"name": "Hanging Gardens of Babylon",
"hex": "#19AC4B"
},
{
"name": "Bloodthirsty Warlock",
"hex": "#EE1F3C"
},
{
"name": "Che Guevara Red",
"hex": "#EB234D"
},
{
"name": "Razzmatazz",
"hex": "#ED3466"
},
{
"name": "Macaroon Rose",
"hex": "#F15381"
},
{
"name": "Out of Fashion",
"hex": "#F06F93"
},
{
"name": "Wonder Lust",
"hex": "#F18CA2"
},
{
"name": "Sweet 60",
"hex": "#F39BA9"
},
{
"name": "Precious Pink",
"hex": "#F4B6B6"
},
{
"name": "Gratifying Green",
"hex": "#DAE2CC"
},
{
"name": "Applemint",
"hex": "#CDE7D1"
},
{
"name": "Enchanted Meadow",
"hex": "#B0D9B8"
},
{
"name": "Frost Gum",
"hex": "#8CCB9A"
},
{
"name": "Jade Stone Green",
"hex": "#6DC184"
},
{
"name": "Forest Maid",
"hex": "#49B968"
},
{
"name": "Matt Green",
"hex": "#2AB148"
},
{
"name": "Liberty Green",
"hex": "#15A14B"
},
{
"name": "Rouge Sarde",
"hex": "#ED1F2E"
},
{
"name": "Charismatic Red",
"hex": "#EC2142"
},
{
"name": "Eugenia Red",
"hex": "#ED3C60"
},
{
"name": "Drunk Tank Pink",
"hex": "#EF5972"
},
{
"name": "Flower Blossom Pink",
"hex": "#F4778B"
},
{
"name": "Pink Geranium",
"hex": "#F48F9D"
},
{
"name": "Candy Heart Pink",
"hex": "#F89DA6"
},
{
"name": "Pink Mimosa",
"hex": "#F4B5AC"
},
{
"name": "Silver Fern",
"hex": "#E2DEC1"
},
{
"name": "Butter Lettuce",
"hex": "#D0E7CC"
},
{
"name": "Fizz",
"hex": "#B5D9AD"
},
{
"name": "Fennel",
"hex": "#92CE96"
},
{
"name": "Young Fern",
"hex": "#6EC27C"
},
{
"name": "Samphire Green",
"hex": "#49B85B"
},
{
"name": "Vitalize",
"hex": "#26A94B"
},
{
"name": "Get up and Go",
"hex": "#159A4A"
},
{
"name": "Lust",
"hex": "#EB1E27"
},
{
"name": "Poppy Power",
"hex": "#EC273A"
},
{
"name": "Desire",
"hex": "#EF3C53"
},
{
"name": "Pink Pepper",
"hex": "#F15C69"
},
{
"name": "Momo Peach",
"hex": "#F5777E"
},
{
"name": "Fruity Licious",
"hex": "#F48E90"
},
{
"name": "Young Crab",
"hex": "#F89E99"
},
{
"name": "Salmon Fresco",
"hex": "#F8B19E"
},
{
"name": "Springtime",
"hex": "#E8E1B2"
},
{
"name": "Green Vibes",
"hex": "#D5E7BF"
},
{
"name": "Apple Cream",
"hex": "#B4D9A4"
},
{
"name": "Botanist",
"hex": "#97CD89"
},
{
"name": "Soft Green",
"hex": "#72C271"
},
{
"name": "Chlorella Green",
"hex": "#4FB34F"
},
{
"name": "Gangly Gremlin",
"hex": "#2FA349"
},
{
"name": "Grass Court",
"hex": "#0F9046"
},
{
"name": "Ottoman Red",
"hex": "#EE2025"
},
{
"name": "Imperial Red",
"hex": "#EE2B34"
},
{
"name": "Glowing Brake Disc",
"hex": "#EF404B"
},
{
"name": "Dubarry",
"hex": "#EF5D65"
},
{
"name": "Breeze of Chilli",
"hex": "#F27471"
},
{
"name": "Ibis Wing",
"hex": "#F68F83"
},
{
"name": "Pink Eraser",
"hex": "#F69F95"
},
{
"name": "October Haze",
"hex": "#F8AD8D"
},
{
"name": "Flourish",
"hex": "#ECDE9D"
},
{
"name": "Lichen Gold",
"hex": "#DBE8AF"
},
{
"name": "Lickety Split",
"hex": "#C0DD98"
},
{
"name": "Gossip",
"hex": "#9FD081"
},
{
"name": "Hillside Grove",
"hex": "#7BC368"
},
{
"name": "Goose Turd Green",
"hex": "#53B347"
},
{
"name": "Formal Garden",
"hex": "#379B4A"
},
{
"name": "The Wild Apothecary",
"hex": "#128B41"
},
{
"name": "First Blood",
"hex": "#EE2126"
},
{
"name": "Naga Viper Pepper",
"hex": "#ED2B2D"
},
{
"name": "Trial by Fire",
"hex": "#ED3C3D"
},
{
"name": "Hot Coral",
"hex": "#F25954"
},
{
"name": "Melon Refresher",
"hex": "#F3766A"
},
{
"name": "Juicy Passionfruit",
"hex": "#F38873"
},
{
"name": "Tropical Paradise",
"hex": "#F9A187"
},
{
"name": "Orange Chiffon",
"hex": "#F8AF7F"
},
{
"name": "Late Day Sun",
"hex": "#F3E190"
},
{
"name": "Fresh Frapp\u00e9",
"hex": "#DEE99E"
},
{
"name": "Spring Lawn",
"hex": "#C9E18F"
},
{
"name": "Livery Green",
"hex": "#A5D274"
},
{
"name": "Vivid Spring",
"hex": "#8AC561"
},
{
"name": "Sonata in Green Minor",
"hex": "#5DB344"
},
{
"name": "Fervent Green",
"hex": "#3E9C47"
},
{
"name": "Rich Green",
"hex": "#1D8842"
},
{
"name": "Fiery Red",
"hex": "#E11F29"
},
{
"name": "Bloodmyst Isle",
"hex": "#ED2726"
},
{
"name": "Sparkling Red",
"hex": "#EE372D"
},
{
"name": "Strawberry Avalanche",
"hex": "#ED4E3F"
},
{
"name": "Royal Blush",
"hex": "#F26F53"
},
{
"name": "Pink Fire",
"hex": "#F68762"
},
{
"name": "Pumpkin Hue",
"hex": "#F8A47B"
},
{
"name": "Market Melon",
"hex": "#FBB478"
},
{
"name": "Club-Mate",
"hex": "#F6DC7E"
},
{
"name": "Pineapple Perfume",
"hex": "#E8EB89"
},
{
"name": "Carolina Parakeet",
"hex": "#D8E584"
},
{
"name": "Fashion Green",
"hex": "#B2D56E"
},
{
"name": "Lone Hunter",
"hex": "#93C853"
},
{
"name": "Pure Apple",
"hex": "#6CBE45"
},
{
"name": "Mid Green",
"hex": "#4DA645"
},
{
"name": "Paperboy's Lawn",
"hex": "#249146"
},
{
"name": "Star and Crescent Red",
"hex": "#C41F27"
},
{
"name": "Akira Red",
"hex": "#E52229"
},
{
"name": "Satan",
"hex": "#EB3428"
},
{
"name": "Fuego",
"hex": "#F05631"
},
{
"name": "Chinese Orange",
"hex": "#F26E43"
},
{
"name": "Orange Slice",
"hex": "#F4905F"
},
{
"name": "Trump Tan",
"hex": "#F9A46D"
},
{
"name": "Interactive Cream",
"hex": "#FBB86C"
},
{
"name": "Nacho Cheese Yellow",
"hex": "#FCD86A"
},
{
"name": "Elfin Yellow",
"hex": "#EDEB83"
},
{
"name": "Grape Cassata",
"hex": "#DEE783"
},
{
"name": "Citrus Lime",
"hex": "#C2DA6B"
},
{
"name": "Two Peas in a Pod",
"hex": "#A1CC52"
},
{
"name": "Ultra Green",
"hex": "#7ABF43"
},
{
"name": "Jungle Jewels",
"hex": "#56A74A"
},
{
"name": "Wild Forest",
"hex": "#379545"
},
{
"name": "Upsdell Red",
"hex": "#AD2125"
},
{
"name": "Pure Red",
"hex": "#D32924"
},
{
"name": "Lionfish Red",
"hex": "#E03A28"
},
{
"name": "Sunset Blaze",
"hex": "#EE5E2B"
},
{
"name": "Sea Nettle",
"hex": "#F3773C"
},
{
"name": "Holland Tulip",
"hex": "#F79755"
},
{
"name": "Candied Yams",
"hex": "#F9A963"
},
{
"name": "Orange Quench",
"hex": "#FDBB62"
},
{
"name": "Naples Yellow",
"hex": "#FCD961"
},
{
"name": "Dolly",
"hex": "#F4F06D"
},
{
"name": "Sunny Lime",
"hex": "#E6EA7F"
},
{
"name": "Chinese Green",
"hex": "#D2E063"
},
{
"name": "Young Green Onion",
"hex": "#B0D34D"
},
{
"name": "Jasmine Green",
"hex": "#80C344"
},
{
"name": "Sour Candy",
"hex": "#61B146"
},
{
"name": "Kryptonite Green",
"hex": "#3F9943"
},
{
"name": "Red Vitality",
"hex": "#9F1D21"
},
{
"name": "Red Seal",
"hex": "#C72E25"
},
{
"name": "Furnace",
"hex": "#D73F28"
},
{
"name": "Santiago Orange",
"hex": "#E85E23"
},
{
"name": "Sun Orange",
"hex": "#F3792A"
},
{
"name": "Troll Slayer Orange",
"hex": "#F7A34D"
},
{
"name": "Pani Puri",
"hex": "#F7AB56"
},
{
"name": "Honey Crusted Chicken",
"hex": "#FCBD55"
},
{
"name": "Buzz-In",
"hex": "#FDD756"
},
{
"name": "Maizena",
"hex": "#FAED60"
},
{
"name": "Limelight",
"hex": "#EEE86B"
},
{
"name": "Maximum Green Yellow",
"hex": "#DFE253"
},
{
"name": "Solid Gold",
"hex": "#B4D545"
},
{
"name": "Aromatic Herbs",
"hex": "#95C93E"
},
{
"name": "Nasty Green",
"hex": "#6DB343"
},
{
"name": "Oregano Green",
"hex": "#4CA045"
},
{
"name": "Classy Red",
"hex": "#941E1D"
},
{
"name": "Bricky Brick",
"hex": "#B83826"
},
{
"name": "Peanut Butter Jelly",
"hex": "#CE4B29"
},
{
"name": "Glazed Carrot",
"hex": "#E66827"
},
{
"name": "Fluorescent Red Orange",
"hex": "#F88725"
},
{
"name": "T\u014dmorokoshi Corn",
"hex": "#FAA73E"
},
{
"name": "Turbinado Sugar",
"hex": "#FABA5B"
},
{
"name": "Chunky Bee",
"hex": "#FFC84D"
},
{
"name": "Royal Star",
"hex": "#FDDE4F"
},
{
"name": "Paris Daisy",
"hex": "#F7ED50"
},
{
"name": "Sulphuric",
"hex": "#F0EB5C"
},
{
"name": "First Colours of Spring",
"hex": "#E4E748"
},
{
"name": "Greenivorous",
"hex": "#C8DB40"
},
{
"name": "Green Lantern",
"hex": "#A0CC3A"
},
{
"name": "Spring Sprout",
"hex": "#7FBA41"
},
{
"name": "Zatar Leaf",
"hex": "#59A348"
},
{
"name": "Falu Red",
"hex": "#831E19"
},
{
"name": "Rooibos Tea",
"hex": "#AC4025"
},
{
"name": "Trinidad",
"hex": "#C34F2A"
},
{
"name": "Autumn Landscape",
"hex": "#E67726"
},
{
"name": "Flame Orange",
"hex": "#F78F21"
},
{
"name": "Startling Orange",
"hex": "#FAAA39"
},
{
"name": "Glowing Lantern",
"hex": "#FCB539"
},
{
"name": "Sunny Festival",
"hex": "#FFC942"
},
{
"name": "Python Yellow",
"hex": "#FED744"
},
{
"name": "Off Yellow",
"hex": "#F5EF48"
},
{
"name": "Blacksmith Fire",
"hex": "#F3EB55"
},
{
"name": "Vibrant Arsenic",
"hex": "#EAE840"
},
{
"name": "Bitter Lemon",
"hex": "#CEDB36"
},
{
"name": "Burst of Lime",
"hex": "#AAD03C"
},
{
"name": "Hill Lands",
"hex": "#87BF40"
},
{
"name": "Caterpillar",
"hex": "#61A241"
},
{
"name": "Tempered Chocolate",
"hex": "#772119"
},
{
"name": "Fluorescent Fire",
"hex": "#9B4021"
},
{
"name": "Fallen Canopy",
"hex": "#B85B28"
},
{
"name": "Cherokee Dignity",
"hex": "#DA7526"
},
{
"name": "Miami Marmalade",
"hex": "#F8951D"
},
{
"name": "Late Afternoon",
"hex": "#F9AC2C"
},
{
"name": "Hot Sun",
"hex": "#FAB72A"
},
{
"name": "Pineapple Gold",
"hex": "#FFC831"
},
{
"name": "Traffic Yellow",
"hex": "#FBDA35"
},
{
"name": "Zard Yellow",
"hex": "#F8E934"
},
{
"name": "Yellow Petal",
"hex": "#F2EB4D"
},
{
"name": "Lime Time",
"hex": "#E9EA38"
},
{
"name": "Pear",
"hex": "#D7DF31"
},
{
"name": "Tender Shoot",
"hex": "#B4D435"
},
{
"name": "Funky Frog",
"hex": "#96C03C"
},
{
"name": "Festival Green",
"hex": "#6DA641"
},
{
"name": "Moussaka",
"hex": "#6A2715"
},
{
"name": "Autumn Red",
"hex": "#954620"
},
{
"name": "Caramelised Maple",
"hex": "#AE5B26"
},
{
"name": "Dulce de Leche",
"hex": "#D78028"
},
{
"name": "Burning Trail",
"hex": "#EF9820"
},
{
"name": "Tangerine Twist",
"hex": "#FBB11D"
},
{
"name": "Sunflower Valley",
"hex": "#FABF27"
},
{
"name": "Lemon Punch",
"hex": "#FFCF2A"
},
{
"name": "Golden Honey Suckle",
"hex": "#FCDC28"
},
{
"name": "Banana Bombshell",
"hex": "#F8EA29"
},
{
"name": "Biotic Grasp",
"hex": "#F4EB43"
},
{
"name": "Pika Yellow",
"hex": "#EBE92A"
},
{
"name": "Puke Green",
"hex": "#DBDF26"
},
{
"name": "Las Palmas",
"hex": "#BED632"
},
{
"name": "Pesto Genovese",
"hex": "#99C43E"
},
{
"name": "Parakeet",
"hex": "#78AA42"
},
{
"name": "Count Chocula",
"hex": "#5F2C14"
},
{
"name": "Brown Eyed Girl",
"hex": "#884B1E"
},
{
"name": "Scarecrow Frown",
"hex": "#A56028"
},
{
"name": "Harvest at Dusk",
"hex": "#CA852B"
},
{
"name": "Clarified Butter",
"hex": "#E89F2A"
},
{
"name": "Golden Treasure",
"hex": "#FAB119"
},
{
"name": "Ukon Saffron",
"hex": "#F9C019"
},
{
"name": "Sunnyside",
"hex": "#FAD118"
},
{
"name": "Gingerline",
"hex": "#FCDD0E"
},
{
"name": "Pico Sun",
"hex": "#F7EB24"
},
{
"name": "Highlighter Yellow",
"hex": "#F3EA42"
},
{
"name": "Herbery Honey",
"hex": "#EDEA21"
},
{
"name": "Birdie",
"hex": "#DDE527"
},
{
"name": "Fuego Verde",
"hex": "#C0D72E"
},
{
"name": "Android Green",
"hex": "#9EC33B"
},
{
"name": "Greenery",
"hex": "#7CA541"
}
];
