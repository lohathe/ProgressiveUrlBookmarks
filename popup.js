function l(s) {console.log(s);}

function getActiveTab() {
    return browser.tabs.query({active: true, currentWindow: true});
}

function getExtensionBookmarksFolder() {
    const FOLDER_NAME = "PUB_folder___";
    return browser.bookmarks.search({title: FOLDER_NAME})
        .then((bookmarks) => {
            if (bookmarks.length == 0) {
                // create the folder if it doesn't already exist
                // TODO: should we handle this case with an error since the
                // folder should be create with the configuration page?
                return browser.bookmarks.create({title: FOLDER_NAME});
            } else if (bookmarks.length > 1) {
                throw Error(`Too many bookmarks folder ${FOLDER_NAME}`);
            } else {
                return bookmarks[0];
            }
        })
        .catch((error) => {
            alert(error);
        });
}

function titleMatchesURL(title, url) {
    return url.search(title) != -1;
}

function isSameSeries(bookmark, current_url) {
    current_url_data = extractTitleAndEpisodeNumber(current_url);
    if (!current_url_data.title || !current_url_data.episode) {
        // should never fall here since `current_url` should be a valid url!
        return false;
    }
    bookmark_data = extractTitleAndEpisodeNumber(bookmark.url);
    if (!bookmark_data.episode) {
        // pay attention to remove only url matching an episode
        return false;
    }
    isSame = bookmark_data.title == current_url_data.title;
    return isSame;
}

function extractTitleAndEpisodeNumber(url) {
    var title = null;
    var episode = null;
    var pieces = url.split("/");
    if (url.search("animefreak") != -1) {
        if (pieces.length >= 5) {
            title = pieces[4].split("-").join(" ");
        }
        if (pieces.length >= 7) {
            episode = pieces[6].split("-")[1];
        }
    } else if (url.search("animeram") != -1) {
        if (pieces.length >= 4) {
            title = pieces[3].split("-").join(" ");
        }
        if (pieces.length >= 5) {
            episode = pieces[4];
        }
    }
    return {
        title: title,
        episode: episode
    };
}

function simplifyURL(url) {
    const data = extractTitleAndEpisodeNumber(url);
    if (data.title == null) {
        return "unsupported URL";
    }
    if (data.episode == null) {
        return data.title;
    }
    return data.title + " > " + data.episode;

}

function showOperationPanel(visible) {
    const episode = document.getElementById("episode");
    const operations = document.getElementById("operations");
    if (visible) {
        episode.classList.remove("hidden");
        operations.classList.remove("hidden");
    } else {
        episode.classList.add("hidden");
        operations.classList.add("hidden");
    }
}

function listTracked() {
    const searching = browser.bookmarks.search({query: "animefreak"});
    searching.then((bookmarks) => {
        var suggestions = document.getElementById("suggestions");
        for (i=0; i<bookmarks.length; i++) {
            const bookmark = bookmarks[i];
            const li = document.createElement("li");
            const text = document.createTextNode(simplifyURL(bookmark.url));
            li.appendChild(text);
            suggestions.appendChild(li);
        }
    });
}

function updateSummary(url) {
    var title = document.getElementById("title");
    var episode = document.getElementById("episode");
    var data = extractTitleAndEpisodeNumber(url);
    if (data.title == null) {
        title.textContent = "unsupported URL!";
        showOperationPanel(false);
    } else {
        title.textContent = data.title;
        showOperationPanel(true);
        if (data.episode) {
            episode.textContent = "ep: " + data.episode;
        }
    }
}

function updateCurrent() {
    getActiveTab().then((tabs) => {
        var url = tabs[0].url;
        updateSummary(url);
        listTracked();
    });

}

function removeBookmarksWithSameTopic(url, bookmark_folder_id) {
    browser.bookmarks.getChildren(id=bookmark_folder_id)
        .then((bookmarks) => {
            // TODO: remove only bookmarks with a previous episode?
            data = extractTitleAndEpisodeNumber(url);
            for (i=0; i<bookmarks.length; i++) {
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

function markCurrentPage() {
    getExtensionBookmarksFolder().then((bookmark_folder) => {
        getActiveTab().then((tabs) => {
            const page_url = tabs[0].url;
            markPage(bookmark_folder, page_url, null)
                .then((new_bookmark) => {
                    window.close();
                })
                .catch((error) => {
                    l(error);
                });
        });
    });
}

document.getElementById("save").addEventListener("click", markCurrentPage);
updateCurrent();
