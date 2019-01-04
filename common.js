function l(s) {console.log(s);}

const DEFAULT_BOOKMARKS_FOLDER = "PUB_playground";

function getFolderNode(folder_name, create_if_missing=false) {
    return browser.bookmarks.search({title: folder_name})
        .then((bookmarks) => {
            if (bookmarks.length == 0 && create_if_missing) {
                return browser.bookmarks.create({title: folder_name});
            } else if (bookmarks.length == 0 && !create_if_missing) {
                throw Error(`Folder "${folder_name}" is missing`)
            } else if (bookmarks.length > 1) {
                throw Error(`Too many bookmarks named "${folder_name}"`);
            } else {
                return bookmarks[0];
            }
        })
}

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

function setBookmarksFolderName(folder_name) {
    return browser.storage.sync.set({
        bookmarks_folder: folder_name,
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
            return getFolderNode(folder_name, create_if_missing=true);
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
            let last_id = 0;
            if (all_rules.length > 0) {
                let all_ids = all_rules.map((x) => {return x.id;});
                last_id = Math.max(...all_ids);
            }
            new_rule.id = last_id + 1;
            all_rules.push(new_rule);
            return browser.storage.sync.set({
                rules: all_rules,
            });
        })
}

function removeRule(rule_id) {
    return getRules()
        .then((old_rules) => {
            let all_rules = [];
            for (let i=0; i<old_rules.length; i++) {
                let rule = old_rules[i];
                if (rule.id == rule_id) {
                    continue;
                }
                let updated_rule = rule;
                updated_rule.id = all_rules.length + 1;
                all_rules.push(updated_rule);
            }
            return browser.storage.sync.set({
                rules: all_rules,
            });
        });
}

function getExtensionRules() {
    return getRules();
}

function getAllBookmarks(sorting="date-descending") {
    return getExtensionBookmarksFolder()
        .then((bookmarks_folder) => {
            return browser.bookmarks.getChildren(id=bookmarks_folder.id);
        })
        .then((bookmarks) => {
            let sort_func = null;
            switch(sorting) {
                case "date-descending":
                    sort_func = function(a, b) {return b.dateAdded-a.dateAdded};
                    break;
                case "date-ascending":
                    sort_func = function(a, b) {return a.dateAdded-b.dateAdded};
                    break;
            }
            if (sort_func) {
                bookmarks.sort(sort_func);
            }
            return bookmarks;
        });
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
                rule_name: current_rule.name,
                rule_id: current_rule.id,
                original_url: url
            };
        }
    }
    return {
        title: null,
        episode: null,
        rule_name: null,
        rule_id: null,
        original_url: url
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
            let bookmarks = res[0];
            let data = res[1];
            for (let i=0; i<bookmarks.length; i++) {
                let bookmark = bookmarks[i];
                Promise.all(
                    [
                        isSameContent(bookmark.url, url),
                        bookmark.id
                    ])
                    .then((res2) => {
                        let is_same = res2[0];
                        let bookmark_id = res2[1];
                        if (is_same) {
                            browser.bookmarks.remove(bookmark_id);
                        }
                    });
            }
        })
}

function isSameContent(url_1, url_2) {
    return Promise.all(
            [
                extractDataFromURL(url_1),
                extractDataFromURL(url_2)
            ])
        .then((res) => {
            var url_1_data = res[0];
            var url_2_data = res[1];
            if (!url_1_data.rule_id || !url_2_data.rule_id) {
                // make sure both urls matched a rule
                return false;
            }
            var isSame = url_1_data.title == url_2_data.title;
            return isSame;
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

function getPreviousRelatedData(target, list) {
    if (target.title == null) {
        return null;
    }
    let related_data = list.filter(function (x) {
        return x.title == target.title;
    });
    related_data.sort(function(a, b) {
        let v1 = parseInt(a.episode, 10);
        let v2 = parseInt(b.episode, 10);
        if (isNaN(v1) && isNaN(v2)) {
            return 0;
        } else if (isNaN(v1)) {
            return -1;
        } else if (isNaN(v2)) {
            return 1;
        } else {
            return v1 - v2;
        }
    });
    if (related_data.length > 0) {
        return related_data[related_data.length-1];
    }
    return null;
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
            const previous_data = getPreviousRelatedData(current_url_data, all_bookmarks_data);
            return {
                current: current_url_data,
                previous: previous_data
            };
        })
}

/*
 * We can have multiple bookmarks for the same url.
 * This function fetches the correct bookmark for the specified url stored
 * in the dedicated PUB bookmark folder.
 */
function getTrackedBookmarkForURL(url) {
    return Promise.all(
        [
            browser.bookmarks.search({url: url}),
            getExtensionBookmarksFolder()
        ])
        .then((res) => {
            const bookmarks_for_url = res[0];
            const bookmark_folder = res[1];
            for (let bookmark of bookmarks_for_url) {
                if (bookmark.parentId == bookmark_folder.id) {
                    return bookmark;
                }
            }
            throw Error(`current page '${url}' is not tracked by PUB!`);
        });
}

function importUrlsFromFolder(folder_name) {
    return getFolderNode(folder_name, create_if_missing=false)
        .then((node) => {
            return browser.bookmarks.getChildren(node.id);
        })
        .then((bookmarks) => {
            let bookmarks_data = [];
            for (let i=0; i<bookmarks.length; i++) {
                bookmarks_data.push(extractDataFromURL(bookmarks[i].url));
            }
            return Promise.all([
                Promise.all(bookmarks_data),
                extractDataFromAllBookmarks()
            ]);
        })
        .then((res) => {
            let importing_bookmarks_data = res[0];
            let currrent_bookmarks_data = res[1];
            let unique_content_from_import = new Set();
            for (let i=0; i<importing_bookmarks_data.length; i++) {
                if (importing_bookmarks_data[i].title == null) {
                    continue;
                }
                unique_content_from_import.add(importing_bookmarks_data[i].title);
            }
            let bookmarks_to_add_or_update = [];
            let all_bookmarks_data = importing_bookmarks_data.concat(currrent_bookmarks_data);
            for (let title of unique_content_from_import) {
                let fake_data = {title: title, episode: null};
                let last_data = getPreviousRelatedData(fake_data, all_bookmarks_data);
                if (!last_data) {
                    continue;
                }
                bookmarks_to_add_or_update.push(last_data);
            }
            return bookmarks_to_add_or_update;
        })
        .then((bookmarks_to_add_or_update) => {
            return Promise.all([
                getExtensionBookmarksFolder(),
                bookmarks_to_add_or_update
            ]);
        })
        .then((res) => {
            let bookmarks_folder = res[0];
            let bookmarks_to_add_or_update = res[1];
            bookmarks_to_add_or_update.forEach(function (x) {
                markPage(bookmarks_folder, x.original_url);
            });
        });
}
