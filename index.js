
const joinAlike = function (geo, attrArray) {

  let filtered_trouble = filterTroubleFeatures(geo.features);
  let constrained = constrainAttributes(filtered_trouble, attrArray);
  let features = addTempId(constrained);

  let combined = true;

  while(combined) {

    const dont_touch_ids = [];

    const valency = getValency(features);

    const dual_valency_pts = Object.keys(valency).filter( key => {
      return valency[key] === 2;
    });

    const legend = createLegend(dual_valency_pts, features);

    const filtered_legend = attributeMatches(legend, attrArray);

    const geo_as_lookup = representGeoAsLookup(features);

    combined = false;

    const f_length = Object.keys(filtered_legend);
    for (let coordset of f_length) {

      const start = filtered_legend[coordset].line_starts_with;
      const end = filtered_legend[coordset].line_ends_with;

      const start_id = start.properties.__tempId__;
      const end_id = end.properties.__tempId__;

      if(dont_touch_ids.includes(start_id) || dont_touch_ids.includes(end_id)) {
        // dont manipulate ids that have already been changed
        // wait until next round recalculation
        continue;
      }

      dont_touch_ids.push(start_id);
      dont_touch_ids.push(end_id);

      // create new segment


      const ID = start_id > end_id ? start_id : end_id;

      // must-equal; just grab from `start`
      const mustEquals = {};
      attrArray
        .filter( attr => {
        return attr.compare === 'must-equal';
      }).forEach( attr => {
        mustEquals[attr.field] = start.properties[attr.field];
      });

      // keep-higher
      const keepHigher = {};
      attrArray
        .filter( attr => {
          return attr.compare === 'keep-higher';
        }).forEach( attr => {
        keepHigher[attr.field] = start.properties[attr.field] > end.properties[attr.field] ?
          start.properties[attr.field] : end.properties[attr.field];
      });

      // keep-lower
      const keepLower = {};
      attrArray
        .filter( attr => {
          return attr.compare === 'keep-lower';
        }).forEach( attr => {
        keepLower[attr.field] = start.properties[attr.field] < end.properties[attr.field] ?
          start.properties[attr.field] : end.properties[attr.field];
      });

      // calc-sum
      const calcSum = {};
      attrArray
        .filter( attr => {
          return attr.compare === 'calc-sum';
        }).forEach( attr => {
        calcSum[attr.field] = start.properties[attr.field] + end.properties[attr.field];
      });

      const properties = { __tempId__: ID, ...mustEquals, ...keepHigher, ...keepLower, ...calcSum};

      // carefully combine geojson
      const geometry = {
        type: 'LineString',
        coordinates: [...end.geometry.coordinates, ...start.geometry.coordinates]
      };

      // create geojson feature
      const segment = {type: 'Feature', properties, geometry};

      combined = true;

      delete geo_as_lookup[String(start_id)];
      delete geo_as_lookup[String(end_id)];

      geo_as_lookup[ID] = segment;
    }

    features = returnGeoToArray(geo_as_lookup);
  }

  return features;
};

function constrainAttributes(features, attributes) {
  return features.map(feature => {

    const constrained = {};
    attributes.forEach(attr => {
      constrained[attr.field] = feature.properties[attr.field];
    });

    return Object.assign({}, feature, {properties: constrained});


  })
}

function filterTroubleFeatures(features) {
  // there will be problems if we dont filter out self connecting linestrings
  return features.filter(feature=> {
    const len = feature.geometry.coordinates.length;
    return feature.geometry.coordinates[0][0] !== feature.geometry.coordinates[len-1][0] &&
      feature.geometry.coordinates[0][1] !== feature.geometry.coordinates[len-1][1];
  });
}

function returnGeoToArray(geo) {
  return Object.keys(geo).map(key=> {
    return geo[key];
  });
}

function addTempId(features) {
  let increment = 0;
  return features.map(feature => {
    increment++;
    const updated_properties = {__tempId__: increment, ...feature.properties};
    return Object.assign({}, feature, { properties: updated_properties });
  })
}


function representGeoAsLookup(features) {
  const lookup = {};

  features.forEach(feature => {
    lookup[feature.properties.__tempId__] = feature;
  });

  return lookup;
}

function createLegend(dual_valency_pts, features) {
  const legend = {};

  // all potential pairs of segments to combine
  dual_valency_pts.forEach(pt=> {
    legend[pt] = {
      line_starts_with: undefined,
      line_starts_with_id: undefined,
      line_ends_with: undefined,
      line_ends_with_id: undefined
    }
  });

  features.forEach(feature => {
    const start_coord = feature.geometry.coordinates[0].join(',');
    const end_coord = feature.geometry.coordinates[feature.geometry.coordinates.length - 1].join(',');

    if(legend[start_coord]) {
      legend[start_coord].line_starts_with = feature;
      legend[start_coord].line_starts_with_id = feature.properties.__tempId__;
    }

    if(legend[end_coord]) {
      legend[end_coord].line_ends_with = feature;
      legend[end_coord].line_ends_with_id = feature.properties.__tempId__;
    }
  });

  return legend;
}

function attributeMatches(legend, attributes) {
  const matches = {};

  // matching operation
  Object.keys(legend).forEach(key => {

    const match = attributes.filter(attr=> {
      return attr.compare === 'must-equal';
    }).every(attr=> {

      // investigate why this happens
      if(!legend[key].line_starts_with || !legend[key].line_ends_with) {
        return false;
      }

      return legend[key].line_starts_with.properties[attr.field] === legend[key].line_ends_with.properties[attr.field];
    });

    if(match) {
      matches[key] = legend[key];
    }
  });

  return matches;
}


function getValency(features) {
  const valency = {};

  features.forEach(feature => {
    const coordinate_length = feature.geometry.coordinates.length;
    const first_coordinate = feature.geometry.coordinates[0].join(',');
    const last_coordinate = feature.geometry.coordinates[coordinate_length -1].join(',');

    if(valency[first_coordinate]) {
      valency[first_coordinate]++;
    } else {
      valency[first_coordinate] = 1;
    }

    if(valency[last_coordinate]) {
      valency[last_coordinate]++;
    } else {
      valency[last_coordinate] = 1;
    }

  });
  return valency;
}

exports.joinAlike = joinAlike;

module.exports = joinAlike;