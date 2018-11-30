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
        .catch((error) => {
            alert(error);
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

function extractDataFromURL(url) {
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
    for (var i=0; i<RULES.length; i++) {
        current_rule = RULES[i];
        var result = extractDataWithRuleFromURL(current_rule.rule_regex, url);
        if (result.title != null) {
            result.rule_name = current_rule.rule_name;
            return result;
        }
    }
    return {
        title: null,
        episode: null,
        rule_name: null
    };
}

function simplifyURL(url) {
    const data = extractDataFromURL(url);
    if (data.title == null) {
        return "unsupported URL";
    }
    if (data.episode == null) {
        return data.title;
    }
    return data.title + " > " + data.episode;
}

function removeBookmarksWithSameTopic(url, bookmark_folder_id) {
    browser.bookmarks.getChildren(id=bookmark_folder_id)
        .then((bookmarks) => {
            // TODO: remove only bookmarks with a previous episode?
            data = extractDataFromURL(url);
            for (var i=0; i<bookmarks.length; i++) {
                bookmark = bookmarks[i];
                if (isSameSeries(bookmark, url)) {
                    browser.bookmarks.remove(bookmark.id);
                }
            }
        })
        .catch((error) => {
            l(error);
        });
}

function isSameSeries(bookmark, current_url) {
    current_url_data = extractDataFromURL(current_url);
    if (!current_url_data.title || !current_url_data.episode) {
        // should never fall here since `current_url` should be a valid url!
        return false;
    }
    bookmark_data = extractDataFromURL(bookmark.url);
    if (!bookmark_data.episode) {
        // pay attention to remove only url matching an episode
        return false;
    }
    isSame = bookmark_data.title == current_url_data.title;
    return isSame;
}

function markPage(bookmark_folder, page_url, page_title) {
    // Add `page_url` as a bookmark inside `bookmark_folder`.
    // Remove bookmarks inside `bookmark_folder` related to the same topic as `page_url`.
    // Label the bookmark with `page_title` if it is specified, otherwise use the title & episode.
    // page_title: string
    // page_url: string
    // bookmark_folder: bookmarks.BookmarkTreeNode
    removeBookmarksWithSameTopic(page_url, bookmark_folder.id);
    bookmark_title = page_title || simplifyURL(page_url);
    return browser.bookmarks.create({
        parentId: bookmark_folder.id,
        title: bookmark_title,
        url: page_url
    });
}
