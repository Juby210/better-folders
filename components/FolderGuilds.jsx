/*
 * Copyright (c) 2020 Juby210 & Lighty
 * Licensed under the Open Software License version 3.0
 */

const { React, getModule, constants } = require('powercord/webpack')
const { findInReactTree } = require('powercord/util')

module.exports = async Guilds => {
    const { guildSeparator, listItem } = await getModule(['unavailableBadge', 'listItem'])
    const GuildFolderStore = await getModule(['getSortedGuilds'])
    const getGuildFolderIdx = id => GuildFolderStore.guildFolders.findIndex(e => e.guildIds.indexOf(id) !== -1)

    const { useDrop } = await getModule(['DropTarget', 'useDrop'])
    const { default: arePropsEqual } = await getModule(m => m?.default &&
        m.default.toString().search(/if\(\w===\w\)return!0;var \w=Object\.keys\(\w\),\w=Object\.key/) !== -1)

    return class FolderGuilds extends Guilds {
        constructor(props) {
            super(props)
            this.renderContent = this.renderContent.bind(this)
        }

        componentDidMount() {
            if (!this.props?.guildFolders) return
            super.componentDidMount()
        }

        renderContent(e) {
            const drop = useDrop({
                accept: [ constants.GuildsBarDragTypes.GUILD ],
                options: { arePropsEqual }
            })
            e.content.ref = drop[1]
            return e.content
        }

        render() {
            if (!this.props?.guildFolders) return null
            const res = super.render()
            if (!res?.props?.children) return res
            const { children } = res.props
            res.props.children = e => {
                const ret = children(e)
                if (!ret?.props?.children?.props?.children) return ret
                const oChildren = ret.props.children.props.children
                ret.props.children.props.children = e => {
                    const res = oChildren(e)
                    try {
                        const scroller = findInReactTree(res, e => e?.onScroll)
                        if (!scroller) return res
                        scroller.children = scroller.children.filter(e => Array.isArray(e?.props?.children))
                        for (const e of scroller.children) {
                            const guilds = e.props.children
                            let idx = 0
                            let lastFolderIdx = -1
                            for (let i = 0; i < guilds.length; i++) {
                                const a = guilds[i];
                                const folderIdx = getGuildFolderIdx(a.key);
                                if (lastFolderIdx !== -1 && lastFolderIdx !== folderIdx) {
                                    guilds.splice(i, 0, <div className={listItem}><div className={guildSeparator} style={{ margin: '5px 0' }} /></div>)
                                    idx = 0
                                    i++
                                }
                                lastFolderIdx = folderIdx
                                guilds[i].props.folderIndex = folderIdx
                                guilds[i].props.index = idx
                                idx++
                            }
                        }
                    } catch (err) {
                        console.error('Failed to modify guilds ret', err)
                    }
                    return res
                }
                return ret
            }
            return React.createElement(this.renderContent, {
                content: res,
                guildFolders: this.props.guildFolders,
                draggingGuildId: this.state.draggingGuildId
            })
        }
    }
}

