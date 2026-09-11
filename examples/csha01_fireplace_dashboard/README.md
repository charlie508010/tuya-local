# Fireplace CSH-A01 dashboard example

This optional example accompanies the `csha01_fireplace` device profile. It is
not installed automatically with the integration, so users can decide whether
to keep their existing Home Assistant dashboard or adopt this one.

The example expects the entity IDs created when the device is named
`Fireplace CSH-A01`. If a different device name is used, adjust the entity IDs
in `fireplace-control-card.js` before installing the card.

## Files

- `fireplace-control-card.js`: local Lovelace web component
- `fireplace-dashboard.yaml`: panel dashboard using the card

## Optional dashboard installation

1. Copy `fireplace-control-card.js` to
   `/config/www/fireplace-control-card.js` on Home Assistant.
2. Add `/local/fireplace-control-card.js?v=10` as a JavaScript module under
   **Settings > Dashboards > Resources**.
3. Copy `fireplace-dashboard.yaml` to `/config/fireplace-dashboard.yaml`.
4. Add this optional dashboard to `configuration.yaml`:

   ```yaml
   lovelace:
     dashboards:
       lovelace-fireplace:
         mode: yaml
         title: Fireplace CSH-A01
         icon: mdi:fireplace
         show_in_sidebar: true
         require_admin: false
         filename: fireplace-dashboard.yaml
   ```

5. Check the Home Assistant configuration and restart Home Assistant.

The card only calls existing Home Assistant entity services. It does not alter
the Tuya protocol, device profile, automations, or entity IDs.
