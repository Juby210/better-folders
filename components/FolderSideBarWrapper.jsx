/*
 * Copyright (c) 2020-2021 Juby210 & Lighty
 * Licensed under the Open Software License version 3.0
 */

const { React, getModule, Flux, FluxDispatcher } = require('powercord/webpack')

module.exports = async (FolderGuilds, warn, getSetting) => {
    const classes = {
        ...await getModule(['sidebar', 'guilds']),
        ...await getModule(['hidden', 'tree'])
    }
    const AnimateModule = await getModule(['useTransition'])
    const GuildFolderStore = await getModule(['getSortedGuilds'])
    const ExpandedFolderStore = await getModule(['getExpandedFolders'])

    class FolderSideBarWrapper extends React.PureComponent {
        constructor(props) {
            super(props)

            this.state = {}
            this.onToggleFolderExpand = this.onToggleFolderExpand.bind(this)
            this.moveGuild = this.moveGuild.bind(this)
            this.onToggleFullScreen = this.onToggleFullScreen.bind(this)
        }
        componentDidMount() {
            FluxDispatcher.subscribe('TOGGLE_GUILD_FOLDER_EXPAND', this.onToggleFolderExpand)
            FluxDispatcher.subscribe('GUILD_MOVE', this.moveGuild)
            FluxDispatcher.subscribe('CHANNEL_RTC_UPDATE_LAYOUT', this.onToggleFullScreen)
            this.onToggleFolderExpand()
        }
        componentWillUnmount() {
            FluxDispatcher.unsubscribe('TOGGLE_GUILD_FOLDER_EXPAND', this.onToggleFolderExpand)
            FluxDispatcher.unsubscribe('GUILD_MOVE', this.moveGuild)
            FluxDispatcher.unsubscribe('CHANNEL_RTC_UPDATE_LAYOUT', this.onToggleFullScreen)
        }
        moveGuild() {
            this.forceUpdate()
        }
        onToggleFolderExpand() {
            this.forceUpdate()
        }
        onToggleFullScreen({ layout }) {
            this.setState({ fullscreen: layout === 'full-screen' })
        }
        render() {
            const guilds = document.querySelector(`.${classes.guilds.split(' ')[0]}`)
            if (!guilds) return null
            const SidebarWidth = guilds.getBoundingClientRect().width /* hack */
            const expandedFolders = ExpandedFolderStore.getExpandedFolders()
            const guildFolders = []
            expandedFolders.forEach(folderId => {
                const guildFolder = GuildFolderStore.getGuildFolderById(folderId)
                if (!guildFolder) return warn(`Could not find expanded folder ${folderId}`)
                guildFolder.guildIds.forEach(guildId =>
                    guildFolders.push({
                        guildIds: [ guildId ]
                    })
                )
            })
            const Sidebar = <FolderGuilds guildFolders={guildFolders} isFolder={true} className={classes.guilds} />
            const visible = !!ExpandedFolderStore.getExpandedFolders().size
            if (!getSetting('sidebarAnim', true)) return visible ? <div className={'BF-folderSidebar'}>{Sidebar}</div> : null
            return <AnimateModule.Transition
                items={ visible }
                from={{ width: 0 }}
                enter={{ width: SidebarWidth }}
                leave={{ width: 0 }}
                config={{ duration: 200 }}
            >
                {(props, show) => show && <AnimateModule.animated.div style={props} className={`BF-folderSidebar ${this.state.fullscreen ? classes.hidden : ''}`}>{Sidebar}</AnimateModule.animated.div>}
            </AnimateModule.Transition>
        }
    }

    return Flux.connectStores([ GuildFolderStore ], () => ({
        guildFolders: GuildFolderStore.guildFolders
    }))(FolderSideBarWrapper)
}
