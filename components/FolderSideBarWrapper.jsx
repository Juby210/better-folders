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
    const FullscreenStore = await getModule(['isFullscreenInContext'])
    const GuildFolderStore = await getModule(['getSortedGuilds'])
    const ExpandedFolderStore = await getModule(['getExpandedFolders'])

    class FolderSideBarWrapper extends React.PureComponent {
        constructor(props) {
            super(props)

            this.state = {}
            this.onToggleFolderExpand = this.onToggleFolderExpand.bind(this)
            this.moveGuild = this.moveGuild.bind(this)
        }
        componentDidMount() {
            FluxDispatcher.subscribe('TOGGLE_GUILD_FOLDER_EXPAND', this.onToggleFolderExpand)
            FluxDispatcher.subscribe('GUILD_MOVE', this.moveGuild)
            this.onToggleFolderExpand()
        }
        componentWillUnmount() {
            FluxDispatcher.unsubscribe('TOGGLE_GUILD_FOLDER_EXPAND', this.onToggleFolderExpand)
            FluxDispatcher.unsubscribe('GUILD_MOVE', this.moveGuild)
        }
        moveGuild() {
            this.forceUpdate()
        }
        onToggleFolderExpand() {
            this.forceUpdate()
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
                guildFolders.push(guildFolder)
            })
            const Sidebar = <FolderGuilds guildFolders={guildFolders} isFolder={true} className={classes.guilds} lurkingGuildIds={[]} expandedFolders={expandedFolders} />
            const visible = !!expandedFolders.size
            if (!getSetting('sidebarAnim', true)) return visible ? <div className={'BF-folderSidebar'}>{Sidebar}</div> : null
            return <AnimateModule.Transition
                items={ visible }
                from={{ width: 0 }}
                enter={{ width: SidebarWidth }}
                leave={{ width: 0 }}
                config={{ duration: 200 }}
            >
                {(props, show) => show && <AnimateModule.animated.div style={props} className={`BF-folderSidebar ${this.props.fullscreen ? classes.hidden : ''}`}>{Sidebar}</AnimateModule.animated.div>}
            </AnimateModule.Transition>
        }
    }

    return Flux.connectStores([ FullscreenStore, GuildFolderStore ], () => ({
        fullscreen: FullscreenStore.isFullscreenInContext(),
        guildFolders: GuildFolderStore.guildFolders
    }))(FolderSideBarWrapper)
}
