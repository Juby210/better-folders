/*
 * Copyright (c) 2020-2021 Juby210 & Lighty
 * Licensed under the Open Software License version 3.0
 */

const { Plugin } = require('powercord/entities')
const { getModule, getModuleByDisplayName, i18n: { Messages }, React, FluxDispatcher } = require('powercord/webpack')
const { SwitchItem } = require('powercord/components/settings')
const { findInTree, findInReactTree, forceUpdateElement, getReactInstance, getOwnerInstance, sleep, waitFor } = require('powercord/util')
const { inject, uninject } = require('powercord/injector')

const Settings = require('./components/Settings')

module.exports = class BetterFolders extends Plugin {
    components = {}

    async startPlugin() {
        powercord.api.settings.registerSettings(this.entityID, {
            category: this.entityID,
            label: 'Better Folders',
            render: props => React.createElement(Settings, { ...props, repatch: () => this.patch(true) })
        })
        this.loadStylesheet('style.css')
        this.IconStore = require('./IconStore')

        this.classes = {
            ...await getModule(['sidebar', 'guilds']),
            ...await getModule(['expandedFolderIconWrapper', 'folder'])
        }

        this.patch() // patch AppView and/or GuildFolder

        this.components.IconSelectorIcon = await (require('./components/IconSelectorIcon'))(this.IconStore)
        this.components.IconSelector = (require('./components/IconSelector'))(this.IconStore, this.components.IconSelectorIcon)
        this.patchFolderSettings()

        const GuildFolderStore = await getModule(['getSortedGuilds'])
        const ExpandedFolderStore = await getModule(['getExpandedFolders'])
        const { toggleGuildFolderExpand } = await getModule(['move', 'toggleGuildFolderExpand'])
        const getGuildFolderIdx = id => GuildFolderStore.guildFolders.findIndex(e => e.guildIds.indexOf(id) !== -1)
        const getGuildFolder = id => GuildFolderStore.guildFolders[getGuildFolderIdx(id)]

        const closeAllFolders = () => {
            const expandedFolders = ExpandedFolderStore.getExpandedFolders()
            for (const id of expandedFolders) toggleGuildFolderExpand(id)
        }

        FluxDispatcher.subscribe('CHANNEL_SELECT', this.onSwitch = data => {
            if (this.lastGuildId !== data.guildId) {
                this.lastGuildId = data.guildId
                const guildFolder = getGuildFolder(data.guildId)
                if (guildFolder?.folderId) {
                    if (!ExpandedFolderStore.isFolderExpanded(guildFolder.folderId)) {
                        if (this.settings.get('forceOpen')) toggleGuildFolderExpand(guildFolder.folderId)
                    } else if (this.settings.get('closeFolder') && !this.settings.get('forceOpen')) {
                        toggleGuildFolderExpand(guildFolder.folderId)
                    }
                } else if (this.settings.get('closeAllFolders')) closeAllFolders()
            }
        })

        FluxDispatcher.subscribe('TOGGLE_GUILD_FOLDER_EXPAND', this.onToggleFolder = e => {
            if (this.dispatching || !this.settings.get('closeOthers')) return
            FluxDispatcher.wait(() => {
                const expandedFolders = ExpandedFolderStore.getExpandedFolders()
                if (expandedFolders.size > 1) {
                    this.dispatching = true
                    for (const id of expandedFolders) if (id !== e.folderId) toggleGuildFolderExpand(id)
                    this.dispatching = false
                }
            })
        })

        const { DefaultHomeButton } = await getModule(['DefaultHomeButton'])
        inject('better-folders-homebtn', DefaultHomeButton.prototype, 'render', (_, res) => {
            if (!this.settings.get('closeAllHomeButton') || !res?.props) return res
            res.props.onClick = closeAllFolders
            return res
        })
    }

    async pluginWillUnload() {
        powercord.api.settings.unregisterSettings(this.entityID)
        uninject('better-folders-appview')
        uninject('better-folders-folder')
        uninject('better-folders-foldersettings')
        uninject('better-folders-homebtn')

        if (this.onSwitch) FluxDispatcher.unsubscribe('CHANNEL_SELECT', this.onSwitch)
        if (this.onToggleFolder) FluxDispatcher.unsubscribe('TOGGLE_GUILD_FOLDER_EXPAND', this.onToggleFolder)

        const { container } = await getModule(['container', 'downloadProgressCircle'])
        forceUpdateElement(`.${container.split(' ')[0]}`, true)
    }

    async getAppViewInstance() {
        const { container } = await getModule(['container', 'downloadProgressCircle'])
        return getOwnerInstance(await waitFor(`.${container.split(' ')[0]}`))
    }

    async patch(repatch) {
        if (repatch) {
            uninject('better-folders-appview')
            uninject('better-folders-folder')
        }
        if (this.settings.get('folderSidebar', true)) this.patchAppView()
        else {
            await this.patchFolder()
            if (repatch) (await this.getAppViewInstance()).forceUpdate()
        }
    }

    async patchAppView() {
        const AppViewInstance = await this.getAppViewInstance()
        if (powercord.pluginManager.isEnabled('pc-notices') && powercord.pluginManager.get('pc-notices')) {
            while (!AppViewInstance.props.children.__powercordOriginal_type)
                await sleep(1)
        }

        const Guilds = findInTree(
            getReactInstance(await waitFor(`.${this.classes.guilds.split(' ')[0]}`)),
            e => e?.type?.displayName === 'Guilds',
            { walkable: ['return'] }
        ).type
        const FolderGuilds = await (require('./components/FolderGuilds'))(Guilds)
        const FolderSideBarWrapper = await (require('./components/FolderSideBarWrapper'))(
            FolderGuilds, this.warn.bind(this), this.settings.get.bind(this))

        inject('better-folders-appview', AppViewInstance.props.children, 'type', (_, res) => {
            if (!Array.isArray(res?.props?.children)) return res
            res.props.children.splice(1, 0, React.createElement(FolderSideBarWrapper, {}))
            return res
        })
        AppViewInstance.props.children.type.displayName = 'AppView'
        AppViewInstance.props.children.key = Math.random()

        await this.patchFolder(true)
        AppViewInstance.forceUpdate()
    }

    async patchFolder(sidebar) {
        const GuildFolderStore = await getModule(['getSortedGuilds'])
        const { int2hex } = await getModule(['int2hex', 'isValidHex'])

        const GuildFolder = (await getModule(m => m?.type?.render &&
            (m.type.__powercordOriginal_render || m.type.render).toString().indexOf('.Messages.SERVER_FOLDER_PLACEHOLDER') !== -1
        )).type
        inject('better-folders-folder', GuildFolder, 'render', (args, res) => {
            if (sidebar) {
                const folder = findInReactTree(res, e => e?.props && !(e.props.id || '').indexOf('folder-items-'))
                if (folder) folder.props.expanded = false
            }

            const sets = this.settings.get('folderSettings', {})[args[0].folderId]
            if ((sets?.icon && sets.icon !== '0' && args[0].expanded) || sets?.closedIcon) {
                const iconParent = findInReactTree(res, e => e?.children?.type?.displayName === 'FolderIcon')
                if (iconParent) {
                    const icon = this.IconStore.icons[sets?.icon || 0]
                    if (icon) iconParent.children = React.createElement('div', {
                        className: `${this.classes.folderIconWrapper} ${this.classes.expandedFolderIconWrapper}`,
                        style: {
                            '--bf-primary-color': int2hex(args[0].folderColor),
                            '--bf-secondary-color': sets?.secondaryColor || '#ffffff'
                        }
                    }, Array.isArray(icon) ? icon[args[0].expanded ? 1 : 0] : icon)
                }
            }

            if (this.settings.get('folderNameIsNumber') && (!args[0].folderName || !args[0].folderName.length)) {
                const idx = GuildFolderStore.guildFolders.filter(f => f.folderId).findIndex(m => m.folderId === args[0].folderId) + 1
                const tooltipProps = findInReactTree(res, e => e?.text)
                if (tooltipProps) tooltipProps.text = `${Messages.SERVER_FOLDER_PLACEHOLDER} #${idx}`
            }
            return res
        })
        // let other plugins find module easier
        const oString = GuildFolder.__powercordOriginal_render.toString()
        GuildFolder.render.toString = () => oString

        this.forceUpdateFolder()
    }

    forceUpdateFolder(id) { // if id is empty just updates all folders
        try {
            let instances = [ ...document.querySelectorAll('.' + this.classes.wrapper) ].map(e => getOwnerInstance(e))
            if (id) instances = instances.filter(i => i.props.childProps.folderId === id)
            instances.forEach(instance => {
                const rand = Math.random()
                inject(`better-folders-folder-temp${rand}`, instance, 'render', function (_, res) {
                    if (!res?.props) return res
                    uninject(`better-folders-folder-temp${rand}`)
                    res.key = rand
                    const oRef = res.props.setFolderRef
                    res.props.setFolderRef = (...args) => {
                        this.forceUpdate()
                        return oRef(...args)
                    }
                    return res
                })
                instance.forceUpdate()
            })
        } catch (e) {}
    }

    async patchFolderSettings() {
        const colors = [0, 5433630, 3066993, 1752220, 3447003, 3429595, 8789737, 10181046, 15277667, 15286558, 15158332, 15105570, 15844367, 13094093, 7372936, 6513507, 16777215, 3910932, 2067276, 1146986, 2123412, 2111892, 7148717, 7419530, 11342935, 11345940, 10038562, 11027200, 12745742, 9936031, 6121581, 2894892]

        const classes = await getModule(['marginBottom20'])
        const { int2hex, hex2int } = await getModule(['int2hex', 'isValidHex'])
        const FormItem = await getModuleByDisplayName('FormItem')

        const _this = this
        const GuildFolderSettingsModal = await getModuleByDisplayName('GuildFolderSettingsModal')
        inject('better-folders-foldersettings', GuildFolderSettingsModal.prototype, 'render', function (_, res) {
            const form = findInReactTree(res, e => e?.type === 'form' && Array.isArray(e.props?.children))
            if (!form) return res

            const fId = this.props.folderId
            if (!this.state.__bf) {
                const sets = _this.settings.get('folderSettings', {})[fId]
                this.state = {
                    ...this.state,
                    icon: sets?.icon || '0',
                    secondaryColor: sets?.secondaryColor ? hex2int(sets.secondaryColor) : 16777215, // white
                    closedIcon: sets?.closedIcon,
                    __bf: true
                }
            }

            res.props.size = 'big'
            const colorPicker = findInReactTree(form, e => e?.props?.colors)
            if (colorPicker) colorPicker.props.colors = colors
            form.props.children.push(
                React.createElement(
                    FormItem, { className: classes.marginBottom20, title: 'Secondary Folder Color' },
                    React.createElement(colorPicker?.type || (() => null), {
                        defaultColor: 16777215, // white
                        colors,
                        value: this.state.secondaryColor,
                        onChange: i => {
                            _this.saveFolderSettings(fId, { secondaryColor: int2hex(i) })
                            this.setState({ secondaryColor: i })
                        }
                    })
                ),
                React.createElement(
                    FormItem, { className: classes.marginBottom20, title: 'Folder Icon' },
                    React.createElement(_this.components.IconSelector, {
                        selected: this.state.icon,
                        onIconClicked: i => {
                            _this.saveFolderSettings(fId, { icon: i })
                            this.setState({ icon: i })
                        },
                        color: int2hex(this.state.color),
                        secondaryColor: int2hex(this.state.secondaryColor),
                        onIconDeleted: () => this.forceUpdate()
                    }),
                    React.createElement(SwitchItem, {
                        className: classes.marginTop8,
                        value: this.state.closedIcon,
                        hideBorder: true,
                        onChange: v => {
                            _this.saveFolderSettings(fId, { closedIcon: v })
                            this.setState({ closedIcon: v })
                        }
                    }, 'Use a closed Icon instead of the Mini-Servers')
                )
            )
            const { onClose } = this.props
            this.props.onClose = () => {
                _this.forceUpdateFolder(fId)
                return onClose()
            }

            return res
        })
    }

    saveFolderSettings(id, newSets) {
        const sets = this.settings.get('folderSettings', {})
        if (!sets[id]) sets[id] = {}
        Object.assign(sets[id], newSets)
        this.settings.set('folderSettings', sets)
    }
}
