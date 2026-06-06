-- =============================================
--  This file is for base menu functionality (admin status,
--  visibility, keybinds, focus callbacks's, threads, etc)
-- =============================================

-- Global Variables
-- TODO: they should be upper case
menuIsAccessible = false
isMenuVisible = false
tsLastMenuClose = 0
menuPermissions = {}
lastTpCoords = false;

-- Locals
local noMenuReason = 'unknown reason'
local awaitingReauth = false

--- Logic to displaying the menu auth rejected snackbar
local function displayAuthRejectedError()
  if noMenuReason == 'nui_admin_not_found' then
    sendSnackbarMessage('error', 'nui_menu.misc.menu_not_admin', true)
  else
    sendSnackbarMessage('error', 'nui_menu.misc.menu_auth_failed', true, { reason = noMenuReason })
  end
end

--- Tests for menu accessibility and displays error snackbar if needed
local function checkMenuAccessible()
  if not TX_MENU_ENABLED then
    sendSnackbarMessage('error', 'nui_menu.misc.not_enabled', true)
    return false
  end
  if not menuIsAccessible then
    displayAuthRejectedError()
    return false
  end

  return true
end


-- Register vibeSM command
local function vibesm(_, args)
  if not checkMenuAccessible() then return end

  -- Make visible
  toggleMenuVisibility()

  -- Shortcut to open a specific players profile
  if isMenuVisible and #args >= 1 then
    local targetPlayer = table.concat(args, ' ')
    sendMenuMessage('openPlayerModal', targetPlayer)
  end
end
RegisterCommand('vibesm', vibesm)
RegisterCommand('tx', vibesm)

RegisterCommand('vibeSM:menu:openPlayersPage', function()
  if not checkMenuAccessible() then return end
  sendMenuMessage('setMenuPage', 1)
  toggleMenuVisibility(true)
  SetNuiFocus(true, true)
end)


-- This needs to run even when menu is disabled so the ServerCtx
-- is updated for react, needed by the Warn page
RegisterSecureNuiCallback('reactLoaded', function(_, cb)
  debugPrint("React loaded, requesting ServerCtx.")

  CreateThread(function()
    updateServerCtx()
    while ServerCtx == false do Wait(0) end
    debugPrint("ServerCtx loaded, sending variables.")
    sendMenuMessage('setGameName', GAME_NAME)
    sendMenuMessage('setDebugMode', TX_DEBUG_MODE)
    sendMenuMessage('setServerCtx', ServerCtx)
    sendMenuMessage('setPermissions', menuPermissions)
  end)

  cb({})
end)


-- =============================================
--  The rest of the file will only run if menu is enabled
-- =============================================

-- Prevent running if menu is disabled
if not TX_MENU_ENABLED then return end

-- Checking with server if we are an admin
TriggerServerEvent('txsv:checkIfAdmin')

-- Triggered as callback of txsv:checkIfAdmin
RegisterNetEvent('txcl:setAdmin', function(username, perms, rejectReason)
  if type(perms) == 'table' then
    debugPrint("^2[AUTH] logged in as '" .. username .. "' with perms: " .. json.encode(perms or "nil"))
    menuIsAccessible = true
    menuPermissions = perms
    if IS_FIVEM then
      --NOTE: appending # to the desc so the sorting shows it at the top
      RegisterKeyMapping('vibesm', 'Open Main Page', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:openPlayersPage', 'Open Players page', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:clearArea', 'Clear Area', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:healMyself', 'Heal Yourself', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:tpBack', 'Teleport: go Back', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:tpToCoords', 'Teleport: to Coords', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:tpToWaypoint', 'Teleport: to Waypoint', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:noClipToggle', 'Toggle NoClip', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:togglePlayerIDs', 'Toggle Player IDs', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:boostVehicle', 'Vehicle: Boost', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:deleteVehicle', 'Vehicle: Delete', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:fixVehicle', 'Vehicle: Fix', 'KEYBOARD', '')
      RegisterKeyMapping('vibeSM:menu:spawnVehicle', 'Vehicle: Spawn', 'KEYBOARD', '')
    end
  else
    noMenuReason = tostring(rejectReason)
    debugPrint("^3[AUTH] rejected (" .. noMenuReason .. ")")
    if awaitingReauth then
      displayAuthRejectedError()
      awaitingReauth = false
    end
    menuIsAccessible = false
    menuPermissions = {}
  end
  sendMenuMessage('setPermissions', menuPermissions)
end)


--[[ Debug Events / Commands ]]
-- Command/event to trigger a authentication attempt
local function retryAuthentication()
  debugPrint("^5[AUTH] Retrying menu authentication.")
  menuIsAccessible = false
  menuPermissions = {}
  sendMenuMessage('setPermissions', menuPermissions)
  TriggerServerEvent('txsv:checkIfAdmin')
end
RegisterNetEvent('txcl:reAuth', retryAuthentication)
RegisterCommand('vibeSM-reauth', function()
  sendSnackbarMessage('info', 'Retrying menu authentication.', false)
  awaitingReauth = true
  retryAuthentication()
end)


-- Register chat suggestions
-- vibeSM starts before the chat resource, so we need to wait a bit
CreateThread(function()
  Wait(1000)
  TriggerEvent(
    'chat:addSuggestion',
    '/tx',
    'Opens the main vibeSM Menu or specific for a player.',
    { { name = "player ID/name", help = "(Optional) Open player modal for specific ID or name." } }
  )
  TriggerEvent(
    'chat:addSuggestion',
    '/vibeSM-reauth',
    'Retries to authenticate the menu NUI.'
  )
end)


-- Will toggle debug logging
RegisterNetEvent('txcl:setDebugMode', function(enabled)
  TX_DEBUG_MODE = enabled
  sendMenuMessage('setDebugMode', TX_DEBUG_MODE)
end)


--[[ NUI Callbacks ]]
-- Triggered whenever we require full focus, cursor and keyboard
RegisterSecureNuiCallback('focusInputs', function(shouldFocus, cb)
  debugPrint('NUI Focus + Keep Input ' .. tostring(shouldFocus))
  -- Will prevent mouse focus on initial menu mount as the useEffect emits there
  if not isMenuVisible then
    return
  end
  SetNuiFocus(true, shouldFocus)
  SetNuiFocusKeepInput(not shouldFocus)
  cb({})
end)


-- When the escape key is pressed in menu
RegisterSecureNuiCallback('closeMenu', function(_, cb)
  isMenuVisible = false
  tsLastMenuClose = GetGameTimer()
  debugPrint('Releasing all NUI Focus')
  SetNuiFocus(false)
  SetNuiFocusKeepInput(false)
  playLibrarySound('enter')
  cb({})
end)


-- Audio play callback
RegisterSecureNuiCallback('playSound', function(sound, cb)
  playLibrarySound(sound)
  cb({})
end)

-- Heals local player
RegisterNetEvent('txcl:heal', function()
  debugPrint('Received heal event, healing to full')
  local ped = PlayerPedId()
  local pos = GetEntityCoords(ped)
  local heading = GetEntityHeading(ped)
  if IsEntityDead(ped) then
    NetworkResurrectLocalPlayer(pos[1], pos[2], pos[3], heading, false, false)
  end
  ResurrectPed(ped)
  SetEntityHealth(ped, GetEntityMaxHealth(ped))
  ClearPedBloodDamage(ped)
  RestorePlayerStamina(PlayerId(), 100.0)
  if IS_REDM then
    Citizen.InvokeNative(0xC6258F41D86676E0, ped, 0, 100) -- SetAttributeCoreValue
    Citizen.InvokeNative(0xC6258F41D86676E0, ped, 1, 100) -- SetAttributeCoreValue
    Citizen.InvokeNative(0xC6258F41D86676E0, ped, 2, 100) -- SetAttributeCoreValue
  end
end)

-- Tell the user he is an admin and that /tx is available
AddEventHandler('playerSpawned', function()
  Wait(15000)
  if menuIsAccessible then
    sendMenuMessage('showMenuHelpInfo', {})
  end
end)
