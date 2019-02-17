# geojson-linestring-join-alike
Join GeoJSON LineStrings with alike attributes.

```bash
npm install geojson-linestring-join-alike --save
```

```javascript
const joinAlike = require('geojson-linestring-join-alike');
const fs = require('fs').promises;

main();

async function main() {
    // load and parse GeoJSON LineString dataset
    const geo_raw = await fs.readFile('./alike.geojson', 'utf8');
    const geo = JSON.parse(geo_raw);

    // determine which attributes must be equal for a pair of line segments
    // to be considered equal, as well as what to do with the 
    // remaining attributes (keep highest, calc sum, etc)
    const attribute_settings = [
      {field: 'MPH', compare: 'must-equal'},
      {field: 'STFIPS', compare: 'must-equal'},
      {field: 'CTFIPS', compare: 'must-equal'},
      {field: 'SIGN1', compare: 'must-equal'},
      {field: 'SIGN2', compare: 'must-equal'},
      {field: 'SIGN3', compare: 'must-equal'},
      {field: 'ID', compare: 'keep-higher'},
      {field: 'MILES', compare: 'calc-sum'}];

    // perform joining operation
    const joined = joinAlike(geo, attribute_settings);

    // save new geojson to file
    await fs.writeFile('./joined.geojson', JSON.stringify(joined), 'utf8');
}

```

`compare` takes one of `['must-equal', 'keep-higher', 'keep-lower', 'calc-sum']`

`must-equal` determines which fields must be equal for a lineString to be considered equal.

`keep-higher`, `keep-lower` determines which value to retain when joining otherwise equal segments (based on `must-equal` criteria)

`calc-sum` merges lineStrings and sums the given field

To see more information, please see my blog post [Cleaning a GeoJSON Network](https://www.danieltrone.com/post/clean-geojson-network-javascript/#join-consecutive-alike-lines).
