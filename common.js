function l(s) {console.log(s);}

const DEFAULT_BOOKMARKS_FOLDER = "PUB_playground";

/*
 * Get the name of the folder specified by the user, or the default name
 */
function getBookmarksFolderName() {
    return browser.storage.sync.get("bookmarks_folder")
        .then((res) => {
            let folder_name = DEFAULT_BOOKMARKS_FOLDER;
            if (res && res.bookmarks_folder) {
                folder_name = res.bookmarks_folder;
            }
            return folder_name;
        });
}

/*
 * Get the browser.bookmarks.BookmarkTreeNode pointing to the extension folder.
 * It creates the folder if it doesn't already exist.
 * It there are 2 or more bookmarks with the same name, then raise an error.
 */
function getExtensionBookmarksFolder() {
    return getBookmarksFolderName()
        .then((folder_name) => {
            return Promise.all(
                    [
                        browser.bookmarks.search({title: folder_name}),
                        folder_name
                    ]);
        })
        .then((data) => {
            bookmarks = data[0];
            folder_name = data[1].bookmarks_folder;
            if (bookmarks.length == 0) {
                return browser.bookmarks.create({title: folder_name});
            } else if (bookmarks.length > 1) {
                throw Error(`Too many bookmarks folder ${folder_name}`);
            } else {
                return bookmarks[0];
            }
        })
}

function getRules() {
    return browser.storage.sync.get("rules")
        .then((res) => {
            let stored_rules = [];
            if (res && Array.isArray(res.rules)) {
                stored_rules = res.rules
            }
            return stored_rules;
        })
}

function appendRule(new_rule) {
    return getRules()
        .then((all_rules) => {
            all_rules.push(new_rule);
            return browser.storage.sync.set({
                rules: all_rules,
            });
        })
}

function getExtensionRules() {
    return getRules();
}

function getAllBookmarks() {
    return getExtensionBookmarksFolder()
        .then((bookmarks_folder) => {
            return browser.bookmarks.getChildren(id=bookmarks_folder.id);
        })
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
        var result = extractDataWithRuleFromURL(current_rule.rule, url);
        if (result.title != null) {
            return {
                title: result.title.replace(/-/g, " "),
                episode: result.episode,
                rule_name: current_rule.name
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

function extractDataFromAllBookmarks() {
    return getAllBookmarks()
        .then((bookmarks) => {
            var extracted_data_promises = [];
            for (let bookmark of bookmarks) {
                extracted_data_promises.push(extractDataFromURL(bookmark.url));
            }
            return Promise.all(extracted_data_promises);
        });
}

function getUrlTrackedData(url) {
    return Promise.all(
            [
                extractDataFromAllBookmarks(),
                extractDataFromURL(url)
            ])
        .then((res) => {
            const all_bookmarks_data = res[0];
            const current_url_data = res[1];
            var result = {
                current: current_url_data,
                previous: null,
            }
            if (current_url_data.title == null) {
                return result;
            }
            const related_bookmarks_data = all_bookmarks_data
                .filter(function(x) {
                        return (x.title == current_url_data.title && parseInt(x.episode, 10) != NaN);
                })
                .sort(function(a, b) {
                    const v1 = parseInt(a.episode, 10);
                    const v2 = parseInt(b.episode, 10);
                    return v1-v2;
                });
            if (related_bookmarks_data.length > 0) {
                result.previous = related_bookmarks_data[related_bookmarks_data.length -1];
            }
            return result;
        })
}
