function getActiveTab() {
    return browser.tabs.query({active: true, currentWindow: true});
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

function listTracked(show_all=false) {
    getAllBookmarks("date-descending")
        .then((bookmarks) => {
            return Promise.all(
                [
                    Promise.all(bookmarks.map((bookmark) => simplifyURL(bookmark.url))),
                    bookmarks.map((bookmark) => bookmark.url),
                    getSuggestionsListLength()
                ]);
        })
        .then((res) => {
            let simplified_urls = res[0];
            let original_urls = res[1];
            let max_urls_to_show = simplified_urls.length;
            if (!show_all) {
                max_urls_to_show = Math.min(res[2], max_urls_to_show);
            }
            let suggestions = document.getElementById("suggestions");
            suggestions.innerHTML = "";
            for (let i=0; i<max_urls_to_show; i++) {
                let simplified_url = simplified_urls[i];
                let original_url = original_urls[i];
                let li = document.createElement("li");
                let text = document.createTextNode(simplified_url);
                li.appendChild(text);
                suggestions.appendChild(li);
                li.addEventListener("click", function() {
                    browser.tabs.update({url: original_url})
                        .then((ignore) => {window.close();});
                });
            }
        });
}

function updateSummary(url) {
    var summary = document.getElementById("summary");
    var title = document.getElementById("title");
    var episode = document.getElementById("episode");
    var from_rule = document.getElementById("at");
    getUrlTrackedData(url)
        .then((data) => {
            const current_data = data.current;
            const previous_data = data.previous;
            if (current_data.title == null) {
                summary.classList.add("unknown");
                title.textContent = "unsupported URL!";
                showOperationPanel(false);
            }
            else {
                title.textContent = current_data.title;
                from_rule.textContent = "@" + current_data.rule_name;
                if (current_data.episode) {
                    episode.textContent = "ep: " + current_data.episode;
                }
                // color background depending on the previously
                // tracked content for the same url.
                if (previous_data == null) {
                    summary.classList.add("untracked");
                    summary.classList.add("unmarked");
                }
                else {
                    current_episode = parseInt(current_data.episode);
                    previous_episode = parseInt(previous_data.episode);
                    if (previous_episode < current_episode) {
                        summary.classList.add("tracked-ahead");
                    }
                    else {
                        summary.classList.add("tracked-behind");
                    }
                    if (previous_episode == current_episode) {
                        summary.classList.add("marked");
                    }
                    else {
                        summary.classList.add("unmarked");
                    }
                }
                showOperationPanel(true);
            }
        });
}

function updateCurrent() {
    getActiveTab().then((tabs) => {
        var url = tabs[0].url;
        updateSummary(url);
        listTracked(show_all=false);
    });
}

function markCurrentPage() {
    return Promise.all(
            [
                getExtensionBookmarksFolder(),
                getActiveTab()
            ])
        .then((res) => {
            const bookmark_folder = res[0];
            const tabs = res[1];
            const page_url = tabs[0].url;
            return markPage(bookmark_folder, page_url)
        })
        .then((new_bookmark) => {
            window.close();
        })
        .catch((error) => {
            l(error);
        });
}

function unmarkCurrentPage() {
    return getActiveTab()
        .then((tabs) => {
            const page_url = tabs[0].url;
            return getTrackedBookmarkForURL(page_url);
        })
        .then((bookmark_to_remove) => {
            // if we didn't find the bookmark, then we raised an error
            return browser.bookmarks.remove(bookmark_to_remove.id);
        })
        .then((ignore) => {
            window.close();
        })
        .catch((error) => {
            l(error);
        });
}

function toggleSuggestionsListLength() {
    let button = document.getElementById("toggle-list-length");
    if (button.textContent == "Show all") {
        button.textContent = "Show less";
        return listTracked(show_all=true);
    } else {
        button.textContent = "Show all";
        return listTracked(show_all=false);
    }
}

function showOptionsPage() {
    return browser.runtime.openOptionsPage()
        .then((ignore) => {
            window.close();
        });
}

document.getElementById("save").addEventListener("click", markCurrentPage);
document.getElementById("delete").addEventListener("click", unmarkCurrentPage);
document.getElementById("open-option-page").addEventListener("click", showOptionsPage);
document.getElementById("toggle-list-length").addEventListener("click", toggleSuggestionsListLength);
updateCurrent();
