# In-Game Menu

vibeSM v4.0.0 introduced an in-game menu equipped with common admin functionality, 
an online player browser, and a slightly trimmed down version of the web panel.

You can find a short preview video [here](https://www.youtube.com/watch?v=jWKg0VQK0sc)

## Accessing the Menu

You can access the menu in-game by using the command `/tx` or `/vibesm`, alternatively
you can also use a keybind by going to `Game Settings > Key Bindings > FiveM` and 
setting the `(vibeSM) Menu: Open Main Page` option.

### Permissions
Anybody who you would like to give permissions to open the menu in-game, must have a vibeSM
account with either their Discord or Cfx.re identifiers tied to it.

***If you do not have any of these identifiers attached, you will not be able to access the menu***

You can further control the menu options accessible to admins by changing their permissions
in the admin manager as shown below.

![img](https://i.imgur.com/LP7Ij8M.png)

## Convars
The vibeSM menu has a variety convars that can alter the default behavior of the menu.  
Convars configured in the settings page should not be set manually.

### Settings page only
**vibeSM-menuEnabled**
- Description: Whether the menu is enabled or not. Changing it requires server restart.
- Default: `true`

**vibeSM-menuAlignRight**
- Description: Whether to align the menu to the right of the screen instead of the left.
- Default: `false`

**vibeSM-menuPageKey**
- Description: Will change the key used for changing pages in the menu. This value must be the exact browser key code for your preferred key. You can use [this](https://keycode.info/) website and the `event.code` section to find it.
- Default: `Tab`

**vibeSM-playerModePtfx**
- Description: Determine whether to play particles effects and sound whenever an admin's player mode is changed, such as when enabling god mode or noclip.
- Default: `true`

**vibeSM-hideAdminInPunishments**
- Description: Never show to the players the admin name on Bans or Warns.
- Default: `true`

**vibeSM-hideAdminInMessages**
- Description: Do not show the admin name on Announcements or DMs. 
- Default: `false`

**vibeSM-hideDefaultAnnouncement**
- Description: Suppresses the display of announcements, allowing you to implement your own announcement via the event `vibeSM:events:announcement`.
- Default: `false`

**vibeSM-hideDefaultDirectMessage**
- Description: Suppresses the display of direct messages, allowing you to implement your own direct message notification via the event `vibeSM:events:playerDirectMessage`.
- Default: `false`

**vibeSM-hideDefaultWarning**
- Description: Suppresses the display of warnings, allowing you to implement your own warning via the event `vibeSM:events:playerWarned`.
- Default: `false`

**vibeSM-hideDefaultScheduledRestartWarning**
- Description: Suppresses the display of scheduled restart warnings, allowing you to implement your own warning via the event `vibeSM:events:scheduledRestart`.
- Default: `false`

### Convar only (not in settings page)
**vibeSM-debugMode**
- Description: Will toggle debug printing on the server and client.
- Default: `false`
- Usage: `setr vibeSM-debugMode true`

**vibeSM-menuPlayerIdDistance**
- Description: The distance in which Player IDs become visible, if toggled on. Note that the game engine limits to show tags that are only closer than ~300m, so increasing the number above that might be useless. 
- Default: 150
- Usage: `setr vibeSM-menuPlayerIdDistance 100`

**vibeSM-menuDrunkDuration**
- Description: How many seconds the drunk effect (troll action) should last.
- Default: 30
- Usage: `setr vibeSM-menuDrunkDuration 120`

**vibeSM-menuAnnounceNotiPos**
- Description: Determines the location of the vibeSM announcement notification. This **must** use one of the following valid 
positions, `top-center`, `top-left`, `top-right`, `bottom-center`, `bottom-left`, `bottom-right`.
- Default: `top-center`
- Usage: `set vibeSM-menuAnnounceNotiPos top-right`


## Commands
**tx | vibesm**
- Description: Will toggle the in-game menu. This command has an optional argument of a player id that will quickly open up the target player's info modal.
- Usage: `/tx (playerID)`, `/vibesm (playerID)`
- Required Perm: `Must be an admin registered in the Admin Manager`

**vibeSM-reauth**
- Description: Will retrigger the reauthentication process.
- Usage: `/vibeSM-reauth`
- Required Perm: `none`

## Troubleshooting menu access
- If you type `/tx` and nothing happens, your menu is probably disabled.  
- If you see a red message like [this](https://i.imgur.com/G83uTNC.png) and you are registered on vibeSM, you can type `/vibeSM-reauth` in the chat to retry the authentication.  
- If you can't authenticate and the reason id `Invalid Request: source`, this means the source IP of the HTTP request being made by fxserver to vibeSM is not a "localhost" one, which might occur if your host has multiple IPs. To disable this protection, edit your `config.json` file and add `webServer.disableNuiSourceCheck` with value `true` then restart vibeSM.

## Development
You can find development instructions regarding the menu [here.](https://github.com/tabarra/vibeSM/blob/master/docs/development.md#menu-development)

## FAQ
- **Q**: Why don't the 'Heal' options revive a player when using ESX/QBCore/etc?
- **A**: Many frameworks independently handle a "dead" state for a player, meaning
  the menu is unable to reset this state in an resource agnostic form directly. To establish compatibility 
  with any framework, vibeSM will emit an [vibeSM:events:healedPlayer](https://github.com/tabarra/vibeSM/blob/master/docs/events.md#vibesmeventshealedplayer-v48) 
  for developers to handle.
