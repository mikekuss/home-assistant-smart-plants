# Sensors and plant health

Smart Plants doesn't talk to hardware. You assign existing Home Assistant sensor entities to
a plant's **roles**, and Smart Plants turns their readings into plant-level sensors, problem
indicators, and a health score.

## Supported roles

| Role | Accepted source units | Valid range | Plant sensor | Problem indicator | Default aggregation |
| --- | --- | --- | --- | --- | --- |
| Soil moisture | `%` | 0–100 % | Soil moisture | Needs water, Too wet, Sensor stale | primary |
| Air temperature | `°C`, `°F`, `K` | −40 to 80 °C | Temperature | Temperature stress | average |
| Air humidity | `%` | 0–100 % | Humidity | Humidity stress | average |
| Illuminance | `lx` | 0–200,000 lx | Illuminance | Low light | primary |
| Conductivity | `µS/cm` (also `μS/cm`, `uS/cm`) | 0–10,000 µS/cm | Conductivity | Conductivity stress | primary |
| Soil temperature | `°C`, `°F`, `K` | −20 to 60 °C | Soil temperature | Soil temperature stress | primary |
| CO₂ | `ppm` | 0–10,000 ppm | CO2 | CO2 stress | average |
| Battery | `%` | 0–100 % | Battery | Low battery | min |

Notes:

- Sources must be entities in the `sensor` domain with a numeric state.
- The unit is checked on every reading. A reading with a missing or different unit, a
  non-numeric state, `unknown`/`unavailable`, or a value outside the valid range is ignored.
- Temperatures in °F or K are converted to °C. Plant temperature sensors report in °C, and
  Home Assistant displays them in your configured unit system.
- The panel's sensor picker filters by device class and unit (for example `moisture` for
  soil moisture, `carbon_dioxide` for CO₂). Use **Show all sensors** if your sensor lacks a
  device class; the unit must still match.

## Multiple sensors per role

Each role accepts up to 32 source sensors. You choose how they are combined:

| Aggregation | Result |
| --- | --- |
| primary | The value of the sensor you marked as primary. There is no automatic fallback: if the primary sensor is invalid or stale, the plant value is unavailable. |
| average | Mean of all valid, fresh sources. |
| min | Lowest valid, fresh source. |
| max | Highest valid, fresh source. |

With **primary**, you must choose a primary sensor, otherwise the role has no value. With
average, min, and max, stale or invalid sources are left out; if none remain, the value is
unavailable.

## Staleness

Each role has a **stale after** window: 6 hours by default, adjustable from 60 seconds to
7 days. A source is stale when it hasn't delivered a valid reading within that window.

- A newly assigned source gets one full window as a grace period before it can be stale.
- An assigned sensor that no longer exists counts as stale.
- The window is measured from the last time the source's state or attributes changed in Home
  Assistant. A very steady sensor that keeps reporting exactly the same value can therefore
  look stale; increase the window for such sensors.

For soil moisture, the **Sensor stale** entity turns on while any assigned moisture source is
stale. For the other roles, the problem indicator becomes unavailable while any of that
role's sources is stale.

## Problem indicators

All problem indicators are binary sensors with the *problem* device class: **on** means
"problem". They use two thresholds each (hysteresis): one to turn on and a separate "clear"
value to turn off, so they don't flicker around a single boundary.

When a role has no valid value, its indicator is **unavailable**, never "off". Unavailable
does not mean healthy.

### Soil moisture

- **Needs water** turns on when moisture drops **below** the minimum and turns off once it
  reaches minimum + 2 percentage points.
- **Too wet** turns on when moisture rises **above** the maximum and turns off once it falls
  to maximum − 2 percentage points.

### Manual watering grace

When you log a **watering** in the plant's care history, *Needs water* stays off for 24 hours
from the time you entered. A backdated entry only gives the remaining part of its 24 hours.
After the grace period, the normal rules apply to the current moisture reading. The grace
period doesn't change the moisture value, *Too wet*, *Sensor stale*, or the health score.

### Low light

Low light is judged from daytime readings only (08:00–18:00 in Home Assistant's time zone).
It uses the brightest reading of the last two hours and needs at least two daytime readings;
until then it's unavailable. Outside daytime, *Low light* stays off and illuminance is left
out of the health score.

## Built-in thresholds

| Role | Turns on | Turns off | Where to edit |
| --- | --- | --- | --- |
| Soil moisture | below 15 % (minimum); above 55 % (maximum); target 35 % | minimum + 2; maximum − 2 | Sensors tab or the number entities |
| Air temperature | ≤ 10 °C (cold) or ≥ 35 °C (hot) | ≥ 12 °C; ≤ 32 °C | Diagnostics tab |
| Air humidity | ≤ 25 % (dry) or ≥ 85 % (damp) | ≥ 30 %; ≤ 80 % | Diagnostics tab |
| Illuminance | brightest recent daytime reading < 500 lx | ≥ 700 lx | Diagnostics tab |
| Conductivity | ≤ 350 µS/cm (low) or ≥ 2000 µS/cm (high) | ≥ 500; ≤ 1800 µS/cm | Diagnostics tab |
| Soil temperature | ≤ 10 °C (cold) or ≥ 35 °C (hot) | ≥ 12 °C; ≤ 32 °C | Diagnostics tab |
| CO₂ | ≥ 5000 ppm | ≤ 4000 ppm | Diagnostics tab |
| Battery | ≤ 20 % | ≥ 25 % | Diagnostics tab |

All thresholds are editable per plant. An override applies only to that plant; clearing it
returns to the default. Moisture thresholds must be whole numbers with
minimum < target < maximum and at least 4 points between minimum and maximum.

If you applied species data from [OpenPlantBook](openplantbook.md), its moisture minimum and
maximum replace the built-in moisture defaults for that plant. Your own overrides always take
precedence.

## Health score

Each plant has a **Health score** sensor from 0 to 100.

**Moisture part.** Moisture is scored continuously: 100 at the target, 50 at the minimum and
at the maximum, falling to 0 at 0 % and 100 % moisture.

**Other roles.** Each other configured role scores 100 while its problem indicator is off and
0 while it is on.

**Combination.** The score is a weighted average of the roles that currently have a value:

| Role | Weight |
| --- | --- |
| Soil moisture | 3 |
| Air temperature | 2 |
| Air humidity, illuminance, conductivity, soil temperature, CO₂ | 1 each |
| Battery | not included |

For example, moisture scoring 80, temperature fine, and humidity stress active gives
(3 × 80 + 2 × 100 + 1 × 0) / 6 ≈ 73.

- Roles without sources, or currently unavailable or stale, are **left out** rather than
  counted as healthy. Illuminance is also left out at night.
- Battery is device health, not plant health, so it never affects the score.
- If no role contributes, the score is unavailable.

The score's attributes tell you how complete it is:

| Attribute | Meaning |
| --- | --- |
| `configured` | Roles that have at least one source. |
| `contributors` | Roles that contributed to the current score. |
| `confidence` | Share of configured roles that contributed (0–1). |
| `confidence_label` | `high` (all), `medium` (at least half), `low` (fewer than half), `unknown` (none configured). |

## When a source sensor changes

Smart Plants stores assigned sensors by their entity registry ID, so the plant keeps working
when you rename a sensor's entity ID. The assignment is updated automatically.

Sensors that are not in the entity registry (no unique ID) are tracked by entity ID only;
renames of those can't be followed.

### When a source sensor disappears

If an assigned sensor is removed from the entity registry, Smart Plants keeps the assignment
and creates a **Repairs** issue: "Smart Plants: assigned source missing".

1. Go to **Settings → System → Repairs** and select the issue.
2. Choose a replacement sensor, or leave the field empty to remove the assignment.
3. Submit.

If the missing sensor was the primary one, the replacement becomes primary. The issue
disappears on its own if the sensor comes back or you change the assignment in the panel.
Disabled plants don't raise these issues.
