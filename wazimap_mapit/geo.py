import logging

from shapely.geometry import asShape
from wazimap.geo import GeoData as BaseGeoData, LocationNotFound
from django.conf import settings

import requests

log = logging.getLogger(__name__)
SETTINGS = settings.WAZIMAP.get('mapit', {})


class GeoData(BaseGeoData):
    MAPIT_API_URL = SETTINGS.get('url', 'http://mapit.code4sa.org')
    MAPIT_LEVELS = SETTINGS.get('levels', {
        'ward': 'WD',
        'municipality': 'MN',
        'province': 'PR',
        'country': 'CY',
    })

    def get_geometry(self, geo_level, geo_code):
        """ Get the geometry description for a geography. This is a dict
        with two keys, 'properties' which is a dict of properties,
        and 'shape' which is a shapely shape (may be None).
        """
        url = self.MAPIT_API_URL + '/area/MDB:%s/feature.geojson?type=%s' % (geo_code, self.MAPIT_LEVELS[geo_level])
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
        resp = requests.get(self.MAPIT_API_URL + '/point/4326/%s,%s' % (longitude, latitude))
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
