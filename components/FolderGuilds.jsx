/*
 * Copyright (c) 2020-2021 Juby210 & Lighty
 * Licensed under the Open Software License version 3.0
 */

const { React, getModule, constants, i18n: { Messages } } = require('powercord/webpack')
const { findInReactTree } = require('powercord/util')

module.exports = async Guilds => {
    const { guildSeparator, listItem } = await getModule(['unavailableBadge', 'listItem'])
    const GuildFolderStore = await getModule(['getSortedGuilds'])
    const getGuildFolderIdx = id => GuildFolderStore.guildFolders.findIndex(e => e.guildIds.indexOf(id) !== -1)

    return props => {
        if (!props.guildFolders) return null
        const ret = Guilds(props)
        const serversList = findInReactTree(ret, e => e && e['aria-label'] === Messages.SERVERS)
        // console.log(props, ret)
        if (serversList) {
            const servers = serversList.children
            ret.props.children.props.children[1].props.children = servers
            for (let i = 0; i < servers.length; i++) {
                const folderProps = servers[i].props
                folderProps.index = getGuildFolderIdx(folderProps.guildIds[0])
                folderProps.__bf_folder = true
                if (i % 2) servers.splice(i, 0, <div className={listItem}><div className={guildSeparator} style={{ margin: '5px 0' }}></div></div>)
            }
        }
        return ret
    }
}
