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

function listTracked() {
    getExtensionBookmarksFolder()
        .then((bookmark_folder) => {
            return browser.bookmarks.getChildren(id=bookmark_folder.id);
        })
        .then((bookmarks) => {
            var suggestions = document.getElementById("suggestions");
            for (var i=0; i<bookmarks.length; i++) {
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
    var from_rule = document.getElementById("at");
    var data = extractDataFromURL(url);
    if (data.title == null) {
        title.textContent = "unsupported URL!";
        showOperationPanel(false);
    } else {
        title.textContent = data.title;
        from_rule.textContent = "@" + data.rule_name;
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
