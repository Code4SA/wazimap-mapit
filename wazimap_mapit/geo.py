import logging

from shapely.geometry import asShape
from wazimap.geo import GeoData as BaseGeoData, LocationNotFound
from django.conf import settings

import requests

log = logging.getLogger(__name__)

SETTINGS = settings.WAZIMAP.setdefault('mapit', {})
SETTINGS.setdefault('url', 'https://mapit.code4sa.org')
SETTINGS.setdefault('level_codes', {
    'ward': 'WD',
    'municipality': 'MN',
    'district': 'DC',
    'province': 'PR',
    'country': 'CY',
})
SETTINGS.setdefault('level_simplify', {
    'DC': 0.01,
    'PR': 0.005,
    'MN': 0.005,
    'WD': 0.0001,
})


class GeoData(BaseGeoData):
    def get_geometry(self, geo_level, geo_code):
        """ Get the geometry description for a geography. This is a dict
        with two keys, 'properties' which is a dict of properties,
        and 'shape' which is a shapely shape (may be None).
        """
        url = SETTINGS['url'] + '/area/MDB:%s/feature.geojson?type=%s' % (geo_code, SETTINGS['level_codes'][geo_level])
        resp = requests.get(url)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()

        feature = resp.json()
        shape = asShape(feature['geometry'])

        return {
            'properties': feature['properties'],
            'shape': shape,
        }

    def get_locations_from_coords(self, longitude, latitude, levels=None):
        """
        Returns a list of geographies containing this point.
        """
        resp = requests.get(SETTINGS['url'] + '/point/4326/%s,%s?generation=1' % (longitude, latitude))
        resp.raise_for_status()

        geos = []
        for feature in resp.json().itervalues():
            try:
                geo = self.get_geography(feature['codes']['MDB'],
                                         feature['type_name'].lower())

                if not levels or geo.geo_level in levels:
                    geos.append(geo)
            except LocationNotFound as e:
                log.warn("Couldn't find geo that Mapit gave us: %s" % feature, exc_info=e)

        return geos
