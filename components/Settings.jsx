/*
 * Copyright (c) 2020-2022 Juby210 & Lighty
 * Licensed under the Open Software License version 3.0
 */

const { React, getModuleByDisplayName } = require('powercord/webpack')
const { SwitchItem } = require('powercord/components/settings')
const FormItem = getModuleByDisplayName('FormItem', false)

module.exports = ({ getSetting, toggleSetting, repatch }) => <>
    <FormItem style={{ marginBottom: '20px' }} title='Animations'>
        <SwitchItem
            value={getSetting('sidebarAnim', true)}
            onChange={() => toggleSetting('sidebarAnim', true)}
        >Folder sidebar animation</SwitchItem>
    </FormItem>
    <FormItem title='Behavior'>
        <SwitchItem
            value={getSetting('folderSidebar', true)}
            onChange={() => {
                toggleSetting('folderSidebar', true)
                repatch()
            }}
        >Display servers from folder on dedicated sidebar</SwitchItem>
        <SwitchItem
            value={getSetting('closeAllFolders')}
            onChange={() => toggleSetting('closeAllFolders')}
        >Close all folders when selecting a server not in a folder</SwitchItem>
        <SwitchItem
            value={getSetting('closeAllHomeButton')}
            onChange={() => toggleSetting('closeAllHomeButton')}
        >Close all folders when clicking on the home button</SwitchItem>
        <SwitchItem
            value={getSetting('closeOthers')}
            onChange={() => toggleSetting('closeOthers')}
        >Close other folders when opening a folder</SwitchItem>
        <SwitchItem
            value={getSetting('closeFolder')}
            onChange={() => toggleSetting('closeFolder')}
        >Close the folder when selecting a server from the folder</SwitchItem>
        <SwitchItem
            value={getSetting('forceOpen')}
            onChange={() => toggleSetting('forceOpen')}
        >Force a folder to open when switching to a server of that folder</SwitchItem>
        <SwitchItem
            value={getSetting('folderNameIsNumber')}
            onChange={() => toggleSetting('folderNameIsNumber')}
        >Folder tooltip shows folder number instead of list of servers unless it has a name set</SwitchItem>
    </FormItem>
</>
