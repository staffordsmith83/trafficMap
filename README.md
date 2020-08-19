# trafficMap
 See working preview at https://staffordsmith83.github.io/trafficMap/

This webmap project was built as a pro bono job for a client who wanted to know traffic flow information, traffic lights locations, and the location of security cameras in the City of Perth. These layers are pulled from MainRoads and SLIP servers as MWS services.

The application can also classify the traffic flow information in any way the user likes. The code for the classification functionality has been adapted from p.t.'s example at [the freeopengis blog](http://freeopengis.blogspot.com/2016/12/integrating-ol3-with-geostatsjs-to.html) and uses the geostats library.

As per the client's request, the users' location is accessed using *navigator.geolocation.watchPosition* and is displayed on the map. The user can choose between OpenStreetMap or the wonderful Stamen Toner basemap.

![screenshot of trafficMap](https://user-images.githubusercontent.com/7980991/90593547-caf06280-e21a-11ea-86d5-aed80faf6789.png)


