// ============================================================
// WATER BODY LOSS DETECTION — WAGHODIA TALUKA 
// ============================================================

// ============================================================
// SECTION 1: STUDY AREA (CLOSED POLYGON)
// ============================================================

var waghodia = ee.Geometry.Polygon([
  [
    [73.275, 22.29],
    [73.52, 22.29],
    [73.52, 22.49],
    [73.275, 22.49],
    [73.275, 22.29] // closed
  ]
]);

Map.centerObject(waghodia, 11);
Map.addLayer(waghodia, {color: 'red'}, 'Study Area');

// ============================================================
// SECTION 2: CLOUD MASK + COMPOSITE
// ============================================================

function maskL8(image) {
  var qa = image.select('QA_PIXEL');

  var mask = qa.bitwiseAnd(1 << 3).eq(0)
    .and(qa.bitwiseAnd(1 << 4).eq(0));

  return image
    .updateMask(mask)
    .multiply(0.0000275)
    .add(-0.2)
    .toFloat()
    .copyProperties(image, ['system:time_start']);
}

function getComposite(start, end) {
  return ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterBounds(waghodia)
    .filter(ee.Filter.calendarRange(start, end, 'year'))
    .filter(ee.Filter.or(
      ee.Filter.calendarRange(11, 12, 'month'),
      ee.Filter.calendarRange(1, 4, 'month')
    ))
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .map(maskL8)
    .select(
      ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'],
      ['Blue','Green','Red','NIR','SWIR1','SWIR2']
    )
    .median()
    .clip(waghodia);
}

var img2015 = getComposite(2014, 2016);
var img2025 = getComposite(2024, 2025);

Map.addLayer(img2015, {bands:['Red','Green','Blue'], min:0, max:0.3}, '2015', false);
Map.addLayer(img2025, {bands:['Red','Green','Blue'], min:0, max:0.3}, '2025');

// ============================================================
// SECTION 3: INDICES
// ============================================================

function addIndices(img) {
  var MNDWI = img.normalizedDifference(['Green','SWIR1']).rename('MNDWI');
  var NDWI  = img.normalizedDifference(['Green','NIR']).rename('NDWI');
  var NDVI  = img.normalizedDifference(['NIR','Red']).rename('NDVI');
  var NDBI  = img.normalizedDifference(['SWIR1','NIR']).rename('NDBI');

  var AWEI = img.expression(
    '4*(G - S1) - (0.25*N + 2.75*S2)', {
      G: img.select('Green'),
      S1: img.select('SWIR1'),
      N: img.select('NIR'),
      S2: img.select('SWIR2')
    }).rename('AWEI');

  return img.addBands([MNDWI, NDWI, NDVI, NDBI, AWEI]);
}

var feat2015 = addIndices(img2015);
var feat2025 = addIndices(img2025);

var bands = ['Blue','Green','Red','NIR','SWIR1','SWIR2',
             'MNDWI','NDWI','NDVI','NDBI','AWEI'];

Map.addLayer(feat2025.select('MNDWI'),
  {min:-0.5,max:0.5,palette:['brown','white','blue']},
  'MNDWI 2025');

// ============================================================
// SECTION 4: TRAINING DATA (FIXED)
// ============================================================

print('Water FC:', water);
print('Non-water FC:', nonwater);

// Convert geometry → FeatureCollection
var waterFC = ee.FeatureCollection(water);
var nonwaterFC = ee.FeatureCollection(nonwater);

// Assign class labels
var waterSamples = waterFC.map(function(f){
  return f.set('class', 1);
});

var nonwaterSamples = nonwaterFC.map(function(f){
  return f.set('class', 0);
});

// Merge both
var samples = waterSamples.merge(nonwaterSamples);

// Sample pixels
var training = feat2025.select(bands).sampleRegions({
  collection: samples,
  properties: ['class'],
  scale: 30,
  tileScale: 8
});

print('Training size:', training.size());
// ============================================================
// SECTION 5: RANDOM FOREST
// ============================================================

var split = training.randomColumn('rand', 42);

var train = split.filter('rand < 0.7');
var test  = split.filter('rand >= 0.7');

var rf = ee.Classifier.smileRandomForest({
  numberOfTrees: 100,
  seed: 42
}).train({
  features: train,
  classProperty: 'class',
  inputProperties: bands
});

var testPred = test.classify(rf);

// Confusion matrix
var cm = testPred.errorMatrix('class','classification');

print('Accuracy:', cm.accuracy());
print('Confusion Matrix:', cm);

// Convert to array
var cmArray = cm.array();

// Extract values
var TP = ee.Number(cmArray.get([1,1]));
var TN = ee.Number(cmArray.get([0,0]));
var FP = ee.Number(cmArray.get([0,1]));
var FN = ee.Number(cmArray.get([1,0]));

// Precision & Recall
var precision_val = TP.divide(TP.add(FP));
var recall_val = TP.divide(TP.add(FN));

// F1 Score
var f1 = precision_val.multiply(recall_val).multiply(2)
         .divide(precision_val.add(recall_val));

print('Precision:', precision_val);
print('Recall:', recall_val);
print('F1 Score:', f1);
// ============================================================
// SECTION 6: CLASSIFICATION
// ============================================================

var c2015 = feat2015.select(bands).classify(rf).rename('water_2015');
var c2025 = feat2025.select(bands).classify(rf).rename('water_2025');

Map.addLayer(c2015, {min:0,max:1,palette:['white','blue']}, 'Water 2015');
Map.addLayer(c2025, {min:0,max:1,palette:['white','blue']}, 'Water 2025');

// ============================================================
// SECTION 7: CHANGE DETECTION
// ============================================================

var change = c2015.multiply(2).add(c2025);

var loss  = change.eq(2).selfMask().rename('loss');
var gain  = change.eq(1).selfMask().rename('gain');
var stableWater = change.eq(3).selfMask().rename('stable');

Map.addLayer(loss,  {palette:'red'}, 'LOSS');
Map.addLayer(gain,  {palette:'green'}, 'GAIN');
Map.addLayer(stableWater, {palette:'blue'}, 'STABLE');
print('Change map values:', change.reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: waghodia,
  scale: 30
}));

// ============================================================
// SECTION 8: AREA CALCULATION (km²)
// ============================================================

var pixelArea = ee.Image.pixelArea().divide(1e6);

function getArea(mask) {
  return mask.selfMask().multiply(pixelArea).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: waghodia,
    scale: 30,
    maxPixels: 1e13
  });
}

var area2015 = getArea(c2015.eq(1));
var area2025 = getArea(c2025.eq(1));
var lossArea = getArea(loss);
var gainArea = getArea(gain);

print('Water Area 2015 (km²):', area2015);
print('Water Area 2025 (km²):', area2025);
print('Loss Area (km²):', lossArea);
print('Gain Area (km²):', gainArea);
// ============================================================
// ============================================================
// SECTION 9: HOTSPOT IDENTIFICATION
// ============================================================

var lossDensity = loss
  .selfMask()
  .convolve(ee.Kernel.gaussian({
    radius: 1500,
    sigma: 500,
    units: 'meters',
    normalize: true
  }))
  .rename('loss_density');

Map.addLayer(
  lossDensity,
  {
    min: 0,
    max: 0.3,
    palette: ['white','yellow','orange','red','darkred']
  },
  'Loss Density Hotspots'
);

// ============================================================
// SECTION 10: EXPORT (FINAL FIXED)
// ============================================================

// 2015
Export.image.toDrive({
  image: c2015.toByte(),
  description: 'WaterMask_2015',
  fileNamePrefix: 'water_2015',
  region: waghodia,
  scale: 30,
  crs: 'EPSG:32643',
  maxPixels: 1e13,
  folder: 'GEE_Waghodia_WaterLoss'
});

// 2025
Export.image.toDrive({
  image: c2025.toByte(),
  description: 'WaterMask_2025',
  fileNamePrefix: 'water_2025',
  region: waghodia,
  scale: 30,
  crs: 'EPSG:32643',
  maxPixels: 1e13,
  folder: 'GEE_Waghodia_WaterLoss'
});

// Loss
Export.image.toDrive({
  image: loss.toByte(),
  description: 'WaterLoss',
  fileNamePrefix: 'water_loss',
  region: waghodia,
  scale: 30,
  crs: 'EPSG:32643',
  maxPixels: 1e13,
  folder: 'GEE_Waghodia_WaterLoss'
});

// Change Map
Export.image.toDrive({
  image: change.toByte(),
  description: 'ChangeMap',
  fileNamePrefix: 'change_map',
  region: waghodia,
  scale: 30,
  crs: 'EPSG:32643',
  maxPixels: 1e13,
  folder: 'GEE_Waghodia_WaterLoss'
});

// Hotspots
Export.image.toDrive({
  image: lossDensity,
  description: 'LossHotspots',
  fileNamePrefix: 'loss_hotspots',
  region: waghodia,
  scale: 30,
  crs: 'EPSG:32643',
  maxPixels: 1e13,
  folder: 'GEE_Waghodia_WaterLoss'
});


Export.image.toDrive({
  image: feat2025.select('MNDWI'),
  description: 'MNDWI_2025',
  fileNamePrefix: 'mndwi_2025',
  region: waghodia,
  scale: 30,
  crs: 'EPSG:32643',
  maxPixels: 1e13,
  folder: 'GEE_Waghodia_WaterLoss'
});

// ============================================================
// METADATA EXPORT
// ============================================================

// Get scene metadata for 2015 collection
var col2015 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(waghodia)
  .filter(ee.Filter.calendarRange(2014, 2016, 'year'))
  .filter(ee.Filter.or(
    ee.Filter.calendarRange(11, 12, 'month'),
    ee.Filter.calendarRange(1, 4, 'month')
  ))
  .filter(ee.Filter.lt('CLOUD_COVER', 20));

var col2025 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(waghodia)
  .filter(ee.Filter.calendarRange(2024, 2025, 'year'))
  .filter(ee.Filter.or(
    ee.Filter.calendarRange(11, 12, 'month'),
    ee.Filter.calendarRange(1, 4, 'month')
  ))
  .filter(ee.Filter.lt('CLOUD_COVER', 20));

// Extract metadata fields
function extractMeta(image) {
  return ee.Feature(null, {
    'Scene_ID':     image.get('LANDSAT_PRODUCT_ID'),
    'Date':         image.date().format('YYYY-MM-dd'),
    'Cloud_Cover':  image.get('CLOUD_COVER'),
    'Sensor':       image.get('SPACECRAFT_ID'),
    'Path':         image.get('WRS_PATH'),
    'Row':          image.get('WRS_ROW'),
    'Year_Group':   image.get('CLOUD_COVER').getInfo < 10 ? '2015' : '2015'
  });
}

var meta2015 = col2015.map(function(img) {
  return ee.Feature(null, {
    'Year_Group':  '2014-2016',
    'Scene_ID':    img.get('LANDSAT_PRODUCT_ID'),
    'Date':        img.date().format('YYYY-MM-dd'),
    'Cloud_Cover': img.get('CLOUD_COVER'),
    'Sensor':      img.get('SPACECRAFT_ID'),
    'Path':        img.get('WRS_PATH'),
    'Row':         img.get('WRS_ROW')
  });
});

var meta2025 = col2025.map(function(img) {
  return ee.Feature(null, {
    'Year_Group':  '2024-2025',
    'Scene_ID':    img.get('LANDSAT_PRODUCT_ID'),
    'Date':        img.date().format('YYYY-MM-dd'),
    'Cloud_Cover': img.get('CLOUD_COVER'),
    'Sensor':      img.get('SPACECRAFT_ID'),
    'Path':        img.get('WRS_PATH'),
    'Row':         img.get('WRS_ROW')
  });
});

var allMeta = meta2015.merge(meta2025);

print('Scene count 2014-2016:', col2015.size());
print('Scene count 2024-2025:', col2025.size());
print('All metadata:', allMeta);

Export.table.toDrive({
  collection: allMeta,
  description: 'Landsat_Metadata_Waghodia',
  fileNamePrefix: 'landsat_metadata',
  fileFormat: 'CSV',
  folder: 'GEE_Waghodia_WaterLoss'
});
