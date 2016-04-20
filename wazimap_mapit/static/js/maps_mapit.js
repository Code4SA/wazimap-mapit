/***
 * A class that loads geography boundary information from
 * mapit.code4sa.org.
 */
function MapItGeometryLoader() {
    var self = this;
    self.mapit_url = '//mapit.code4sa.org';

    /**
     * Fetches geometry data for a comparison view and calls the +success+
     * callback with an object mapping each geo-id to a GeoJSON object.
     */
    this.loadGeometryForComparison = function(comparison, success) {
        // load all country, province, municipality and ward geo data
        var counter = comparison.geoIDs.length;
        var featureMap = {};

        _.each(comparison.geoIDs, function(geoid) {
            // eg. province-WC
            var parts = geoid.split('-'),
                level = parts[0],
                code = parts[1],
                url;

            if (level.indexOf('|') > -1 ) {
                // compound level: province|country-ZA
                parts = level.split('|');
                level = parts[0];
                var filter_level = parts[1];

                url = '/areas/MDB-levels:' +
                      MAPIT_LEVEL_TYPES[filter_level] + '-' + code + '|' + MAPIT_LEVEL_TYPES[level];
            } else {
                // single code
                url = '/areas/MDB:' + code;
            }

            url = url + '.geojson?generation=1';
            var simplify = MAPIT_LEVEL_SIMPLIFY[MAPIT_LEVEL_TYPES[level]];
            if (simplify) {
                url = url + '&simplify_tolerance=' + simplify;
            }

            d3.json(self.mapit_url + url, function(error, geojson) {
                --counter;
                if (error) return console.warn(error);
                var features = geojson.features;
                _.each(features, self.decorateFeature);

                // index by geoid
                _.each(features, function(feature) {
                    featureMap[feature.properties.geoid] = feature;
                });

                if (counter === 0) {
                    // collect those we're interested in
                    var usefulFeatures = {};

                    _.each(comparison.dataGeoIDs, function(geoid) {
                        var feature = featureMap[geoid];
                        feature.properties.name = comparison.data.geography[geoid].name;
                        usefulFeatures[geoid] = feature;
                    });

                    success(usefulFeatures);
                }
            });
        });
    };

    this.decorateFeature = function(feature) {
        feature.properties.level = feature.properties.type_name.toLowerCase();
        feature.properties.code = feature.properties.codes.MDB;
        feature.properties.geoid = feature.properties.level + '-' + feature.properties.code;
    };

    this.loadGeometryForLevel = function(level, success) {
        var url = '/areas/' + MAPIT_LEVEL_TYPES[level] + '.geojson';
        var simplify = MAPIT_LEVEL_SIMPLIFY[MAPIT_LEVEL_TYPES[level]];
        if (simplify) {
            url = url + '?simplify_tolerance=' + simplify;
        }

        d3.json(this.mapit_url + url, function(error, geojson) {
            var features = _.values(geojson.features);
            _.each(features, self.decorateFeature);
            success({features: features});
        });
    };
}

GeometryLoader = new MapItGeometryLoader();
