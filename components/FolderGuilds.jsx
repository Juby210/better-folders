/*
 * Copyright (c) 2020-2021 Juby210 & Lighty
 * Licensed under the Open Software License version 3.0
 */

const { React, getModule } = require('powercord/webpack')
const { findInReactTree } = require('powercord/util')
const { inject, uninject } = require('powercord/injector')

const { Messages } = getModule(m => m.Messages && m.Messages['en-US'], false) || {}

module.exports = async Guilds => {
    const { guildSeparator, listItem } = await getModule(['unavailableBadge', 'listItem'])
    const GuildFolderStore = await getModule(['getSortedGuilds'])
    const getGuildFolderIdx = id => GuildFolderStore.guildFolders.findIndex(e => e.guildIds.indexOf(id) !== -1)
    const GuildsTreeStore = await getModule(['getGuildsTree'])
    const { GuildsTree } = await getModule(['GuildsTree'])

    return props => {
        if (!props.guildFolders) return null
        inject('better-folders-guildsTree', GuildsTreeStore, 'getGuildsTree', (_, res) => {
            const ret = new GuildsTree()
            ret.root.children = res.root.children.filter(e => props.guildFolders.includes(e.id))
            ret.nodes = props.guildFolders.map(id => res.nodes[id])
            return ret
        })
        const ret = Guilds(props)
        uninject('better-folders-guildsTree')
        const serversList = findInReactTree(ret, e => e && e['aria-label'] === Messages.SERVERS)
        // console.log(props, ret)
        if (serversList) {
            const servers = serversList.children
            ret.props.children.props.children[1].props.children = servers
            for (let i = 0; i < servers.length; i++) {
                const folderProps = servers[i].props
                // folderProps.index = getGuildFolderIdx(folderProps.guildIds[0])
                folderProps.__bf_folder = true
                if (i % 2) servers.splice(i, 0, <div className={listItem}><div className={guildSeparator} style={{ margin: '5px 0' }}></div></div>)
            }
        }
        return ret
    }
}
