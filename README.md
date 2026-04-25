# Waterbody-Loss-Analysis-Vadodara
Multi-temporal surface water change detection in Waghodia Taluka, Vadodara (2015–2025) using Landsat 8 and Random Forest classification in Google Earth Engine.

---

Satellite-based change detection analysis of surface water bodies in Waghodia Taluka,
Vadodara District, Gujarat, India over a 10-year period (2015–2025) using Landsat 8
imagery and supervised Random Forest classification in Google Earth Engine.

**Author:** Varun Saxena
**Satellite:** Landsat 8 Collection 2 Level-2 Surface Reflectance  
**Classification:** Supervised Random Forest | Google Earth Engine  
**CRS:** EPSG:32643 (WGS 84 / UTM Zone 43N) | Spatial Resolution: 30 m

---

## Study Area

Waghodia is a taluka (sub-district) of Vadodara district in Gujarat, India, located
to the east and south-east of Vadodara city. The region encompasses mixed agricultural
land, industrial zones (including the Waghodia GIDC industrial estate), scattered rural
settlements, and a significant number of water bodies — most notably **Ajwa Reservoir**,
the primary drinking water source for Vadodara city.

| Parameter | Value |
|-----------|-------|
| District | Vadodara, Gujarat |
| Taluka | Waghodia |
| Lat Extent | 22.30°N – 22.50°N |
| Lon Extent | 73.30°E – 73.52°E |
| Key Water Body | Ajwa Reservoir |
| Major Industry | Waghodia GIDC Industrial Estate |
| CRS | EPSG:32643 |

---

## Tools & Data Sources

- **Google Earth Engine** — classification, change detection, hotspot analysis
- **Landsat 8 Collection 2 Level-2** — surface reflectance imagery
- **QGIS** — map export and cartographic output
- **Google Earth Pro** — site-level validation
- **MNDWI** — supplementary water index for cross-validation

---

## Methodology

### Satellite Data

| Parameter | Year 1 (2015) | Year 2 (2025) |
|-----------|---------------|---------------|
| Satellite | Landsat 8 OLI/TIRS | Landsat 8 OLI/TIRS |
| Collection | C2 Level-2 SR | C2 Level-2 SR |
| Scene Date | January 2015 | January 2025 |
| Cloud Cover | < 20% | < 20% |
| Spatial Resolution | 30 m | 30 m |

### Classification Approach

A supervised **Random Forest** classifier was trained in Google Earth Engine using
manually digitised training polygons for two classes: **Water** and **Non-water**.

- **Water FC:** 240-vertex MultiPolygon covering open water bodies across the taluka
- **Non-water FC:** 229-vertex MultiPolygon covering agricultural land, built-up, and bare soil
- **Training Size:** 48,276 pixels
- **Supplementary Index:** MNDWI (Modified Normalised Difference Water Index) computed
  for 2025 to cross-check classification results
- **Hotspot Layer:** Loss density surface generated using a focal mean kernel on the
  binary loss raster to identify zones of concentrated water body disappearance

### Classifier Accuracy

| Metric | Value |
|--------|-------|
| Overall Accuracy | 98.99% |
| Precision | 99.24% |
| Recall | 98.43% |
| F1 Score | 98.83% |
| Confusion Matrix | [[8184, 47], [98, 6138]] |

---

## Results

### Water Area Statistics

| Metric | Value |
|--------|-------|
| Water Area 2015 | 34.88 km² |
| Water Area 2025 | 54.99 km² |
| Water Loss | 6.26 km² (17.95% of 2015) |
| Water Gain | 26.37 km² (75.61% of 2015) |
| Net Change | +20.11 km² (+57.66%) |

### Hotspot Spatial Pattern

Loss pixels are **dispersed** across the taluka rather than concentrated in a single
zone, suggesting multiple independent causes. Highest loss density clusters near:
- Waghodia town (urban fringe)
- GIDC industrial estate (south)
- Northern agricultural pockets near the Champaner Road corridor

---

## Validation — Google Earth Pro

Three loss sites were validated against Google Earth Pro historical imagery:

| # | Location | Coordinates | Pre (2015) | Post (2025) |
|---|----------|-------------|------------|-------------|
| 1 | Ajwa Reservoir | 22°24'N 73°22'E | Full open water | N. arm sediment exposed |
| 2 | GIDC Pond | 22°17'N 73°22'E | Natural pond intact | Pond reduced, industrial adj. |
| 3 | Rawal Pond | 22°21'N 73°21'E | Clear open water | Dense weed/algae cover |

---

## Key Findings

- **Ajwa Reservoir margins** show progressive siltation and margin retreat, threatening
  Vadodara city's primary drinking water supply
- **Waghodia GIDC corridor** — multiple small ponds partially or fully drained due to
  industrial expansion and waste treatment infrastructure
- **Rural pond network** — seasonal ponds show weed colonisation and progressive
  infilling (eutrophication driven by agricultural runoff)
- **Net trend is positive** — water gain (26.37 km²) far exceeds loss (6.26 km²),
  driven by new farm ponds, check dams, and agricultural water harvesting structures
  under Gujarat government schemes

---

## Tools & Data Sources

- **Google Earth Engine** — classification, change detection, hotspot analysis
- **Landsat 8 Collection 2 Level-2** — surface reflectance imagery
- **QGIS** — map export and cartographic output
- **Google Earth Pro** — site-level validation
- **MNDWI** — supplementary water index for cross-validation
