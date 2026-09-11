"""
Setup for different kinds of Tuya switch devices
"""

import logging

from homeassistant.components.switch import SwitchDeviceClass, SwitchEntity

from .device import TuyaLocalDevice
from .entity import TuyaLocalEntity
from .helpers.config import async_tuya_setup_platform
from .helpers.device_config import TuyaEntityConfig

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass, config_entry, async_add_entities):
    config = {**config_entry.data, **config_entry.options}
    await async_tuya_setup_platform(
        hass,
        async_add_entities,
        config,
        "switch",
        TuyaLocalSwitch,
    )


class TuyaLocalSwitch(TuyaLocalEntity, SwitchEntity):
    """Representation of a Tuya Switch"""

    def __init__(self, device: TuyaLocalDevice, config: TuyaEntityConfig):
        """
        Initialize the switch.
        Args:
            device (TuyaLocalDevice): The device API instance.
        """
        super().__init__()
        dps_map = self._init_begin(device, config)
        self._switch_dps = dps_map.pop("switch")
        self._restore_on_turn_on_dps = []
        self._restore_on_turn_on_values = {}
        for name in config.restore_on_turn_on:
            dps = dps_map.pop(name, None)
            if dps is None:
                _LOGGER.warning(
                    "%s/%s: restore_on_turn_on DPS %s was not found",
                    config._device.config,
                    config.config_id,
                    name,
                )
            else:
                self._restore_on_turn_on_dps.append(dps)
        self._init_end(dps_map)

    def _remember_restore_on_turn_on_values(self):
        """Remember configured values before the device resets them."""
        for dps in self._restore_on_turn_on_dps:
            value = dps.get_value(self._device)
            if value is not None:
                self._restore_on_turn_on_values[dps.id] = value

    @property
    def device_class(self):
        """Return the class of this device"""
        dclass = self._config.device_class
        try:
            return SwitchDeviceClass(dclass)
        except ValueError:
            if dclass:
                _LOGGER.warning(
                    "%s/%s: Unrecognised switch device class of %s ignored",
                    self._config._device.config,
                    self.name or "switch",
                    dclass,
                )

    @property
    def is_on(self):
        """Return whether the switch is on or not."""
        # if there is no switch, it is always on if available.
        if self._switch_dps is None:
            return self.available
        value = self._switch_dps.get_value(self._device)
        if value:
            self._remember_restore_on_turn_on_values()
        return value

    async def async_turn_on(self, **kwargs):
        """Turn the switch on"""
        _LOGGER.info("%s turning on", self._config.config_id)
        settings = self._switch_dps.get_values_to_set(self._device, True)
        for dps in self._restore_on_turn_on_dps:
            if dps.id in self._restore_on_turn_on_values:
                settings.update(
                    dps.get_values_to_set(
                        self._device,
                        self._restore_on_turn_on_values[dps.id],
                        settings,
                    )
                )
        await self._device.async_set_properties(settings)

    async def async_turn_off(self, **kwargs):
        """Turn the switch off"""
        _LOGGER.info("%s turning off", self._config.config_id)
        self._remember_restore_on_turn_on_values()
        await self._switch_dps.async_set_value(self._device, False)
