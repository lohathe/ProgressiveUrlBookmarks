function l(s) {console.log(s);}

function getExtensionBookmarksFolder() {
    return browser.storage.sync.get("bookmarks_folder")
        .then((res) => {
            return Promise.all([browser.bookmarks.search({title: res.bookmarks_folder}), res]);
        })
        .then((data) => {
            bookmarks = data[0];
            folder_name = data[1].bookmarks_folder;
            if (bookmarks.length == 0) {
                // create the folder if it doesn't already exist
                // TODO: should we handle this case with an error since the
                // folder should be create with the configuration page?
                return browser.bookmarks.create({title: folder_name});
            } else if (bookmarks.length > 1) {
                throw Error(`Too many bookmarks folder ${folder_name}`);
            } else {
                return bookmarks[0];
            }
        })
}

function getExtensionRules() {
    const RULES = [
        {
            rule_name: "animefrek",
            rule_regex: "*://www.animefreak.tv/watch/<title>/episode/episode-<episode>"
        },
        {
            rule_name: "animeram",
            rule_regex: "*://ww2.animeram.cc/<title>/<episode>"
        }
    ];
    return Promise.resolve(RULES);
    // return browser.storage.sync.get("rules");
}

function extractDataWithRuleFromURL(rule, url) {
    /* extract relevant data from supplied url: title and episode
     *
     * Algorithm to match a rule:
     * we split both the rule and the input url on "/" and match incrementally
     * each substring using the "regex" offered to the user.
     * We do not create a javascript RegExp from the rule because we want
     * to extract even partial information (aka extract only the title when
     * the input url does not contain any episode).
     */
    function user_regex_to_javascript_regex(user_regex) {
        var javascript_regex = user_regex
            .replace(/\*/g, "[^/]*")
            .replace(/(<title>|<episode>)/g, "([^/]*)");
        return "^" + javascript_regex + "$";
    }
    const partial_rule = rule.split("/");
    const partial_url = url.split("/");
    const min_index = Math.min(partial_rule.length, partial_url.length);
    var title = null;
    var episode = null;
    for (var i=0; i<min_index; i++) {
        const rule_piece = partial_rule[i];
        const url_piece = partial_url[i];
        if (rule_piece.length == 0 && url_piece.length != 0) {
            // avoid to match an empty regexp to a string: it will match
            // and we don't want such false positives!
            break;
        }
        var reg_exp = RegExp(user_regex_to_javascript_regex(rule_piece));
        if (url_piece.match(reg_exp)) {
            const matching_title = rule_piece.search("<title>");
            const matching_episode = rule_piece.search("<episode>");
            if (matching_title == -1 && matching_episode == -1) {
                continue;
            }
            // we are matching title or episode or both: we must know what we
            // are matching to extract the correct piece of information.
            if (matching_title != -1 && matching_episode == -1) {
                title = reg_exp.exec(url_piece)[1];
            } else if (matching_title == -1 && matching_episode != -1) {
                episode = reg_exp.exec(url_piece)[1];
            } else {
                var match1 = reg_exp.exec(url_piece)[1];
                var match2 = reg_exp.exec(url_piece)[1];
                if (matching_title < matching_episode) {
                    title = match1;
                    episode = match2;
                } else {
                    title = match2;
                    episode = match1;
                }
            }

            if (title != null && episode != null) {
                // found all data: early exit
                break;
            }
        } else {
            break;
        }
    }
    return {
        title: title,
        episode: episode
    };
}

function extractDataWithRulesFromURL(rules, url) {
    for (var i=0; i<rules.length; i++) {
        const current_rule = rules[i];
        var result = extractDataWithRuleFromURL(current_rule.rule_regex, url);
        if (result.title != null) {
            return {
                title: result.title.replace(/-/g, " "),
                episode: result.episode,
                rule_name: current_rule.rule_name
            };
        }
    }
    return {
        title: null,
        episode: null,
        rule_name: null
    };
}

function extractDataFromURL(url) {
    return getExtensionRules()
        .then((rules) => {
            return extractDataWithRulesFromURL(rules, url);
        });
}

function formatData(data) {
    if (data.title == null) {
        return "unsupported URL";
    }
    if (data.episode == null) {
        return `[${data.rule_name}] ${data.title}`;
    }
    return `[${data.rule_name}] ${data.title} > ${data.episode}`;
}

function simplifyURL(url) {
    return extractDataFromURL(url)
        .then((data) => {
            return formatData(data);
        });
}

function removeBookmarksWithSameTopic(url, bookmark_folder_id) {
    return browser.bookmarks.getChildren(id=bookmark_folder_id)
        .then((bookmarks) => {
            return Promise.all(
                    [
                        bookmarks,
                        extractDataFromURL(url)
                    ]);
        })
        .then((res) => {
            var bookmarks = res[0];
            var data = res[1];
            for (var i=0; i<bookmarks.length; i++) {
                var bookmark = bookmarks[i];
                isSameSeries(bookmark.url, url, bookmark.id)
                    .then((res2) => {
                        var is_same = res2[0];
                        var bookmark_id = res2[1];
                        if (is_same) {
                            browser.bookmarks.remove(bookmark_id);
                        }
                    });
            }
        })
}

function isSameSeries(bookmark_url, current_url, bookmark_id) {
    return Promise.all(
            [
                extractDataFromURL(bookmark_url),
                extractDataFromURL(current_url)
            ])
        .then((res) => {
            var bookmark_data = res[0];
            var current_url_data = res[1];
            if (!current_url_data.title || !current_url_data.episode) {
                // should never fall here since `current_url` should be a valid url!
                return [false, bookmark_id];
            }
            if (!bookmark_data.episode) {
                // pay attention to remove only url matching an episode
                return [false, bookmark_id];
            }
            var isSame = bookmark_data.title == current_url_data.title;
            return [isSame, bookmark_id];
        });
}

function markPage(bookmark_folder, page_url) {
    // Add `page_url` as a bookmark inside `bookmark_folder`.
    // Remove bookmarks inside `bookmark_folder` related to the same topic as `page_url`.
    // Label the bookmark with rule name, title and episode.
    // page_url: string
    // bookmark_folder: bookmarks.BookmarkTreeNode
    return removeBookmarksWithSameTopic(page_url, bookmark_folder.id)
        .then((ignore) => {
            return simplifyURL(page_url);
        })
        .then((bookmark_title) => {
            return browser.bookmarks.create({
                parentId: bookmark_folder.id,
                title: bookmark_title,
                url: page_url
            });
        });
}