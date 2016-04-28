// extend the default Wazimap ProfileMaps object to add mapit support

var BaseProfileMaps = ProfileMaps;
ProfileMaps = function() {
    var self = this;
    this.mapit_url = GeometryLoader.mapit_url;

    _.extend(this, new BaseProfileMaps());

    this.drawAllFeatures = function() {
        var geo = this.geo;
        var geo_level = geo.this.geo_level;
        var geo_code = geo.this.geo_code;
        var mapit_type = MAPIT.level_codes[geo_level];
        var mapit_simplify = MAPIT.level_simplify[mapit_type];

        // add demarcation boundaries
        if (geo_level == 'country') {
            this.map.setView({lat: -28.4796, lng: 10.698445}, 5);
        } else {
            // draw this geometry
            GeometryLoader.loadGeometryForGeo(geo_level, geo_code, function(feature) {
                self.drawFocusFeature(feature);
            });
        }

        // load surrounding map shapes

        // [level, code] pairs
        var levels = _.map(_.keys(geo.parents), function(level) {
            return [level, geo.parents[level].geo_code];
        });
        levels.unshift([geo_level, geo_code]);
        if (geo.this.child_level) {
            levels.unshift([geo.this.child_level, '']);
        }

        for (var i = 0; i < levels.length; i++) {
            var level = levels[i][0],
                code  = levels[i][1];
            var mapit_level = MAPIT.level_codes[level];

            // For each level, add map shapes for that level, limited to within the
            // parent level (eg. wards within a municipality).

            (function(level, code) {
                if (level == 'country') {
                    return;
                }

                var parent = levels[i+1];
                parent = MAPIT.level_codes[parent[0]] + '-' + parent[1];

                var url = '/areas/MDB-levels:' + parent + '|' + mapit_level +
                          '.geojson?generation=1&simplify_tolerance=' + MAPIT.level_simplify[mapit_level];

                d3.json(self.mapit_url + url, function(error, geojson) {
                    if (error) return console.warn(error);

                    // don't include this smaller geo, we already have a shape for that
                    geojson.features = _.filter(geojson.features, function(f) {
                        return f.properties.codes.MDB != code;
                    });

                    // update names
                    _.each(geojson.features, function(f) {
                        if (level == 'ward') {
                            f.properties.name = 'Ward ' + f.properties.name;
                        }

                        f.properties.code = f.properties.codes.MDB;
                        f.properties.level = level;
                    });

                    self.drawFeatures(geojson);
                });
            })(level, code);
        }
    };
};
