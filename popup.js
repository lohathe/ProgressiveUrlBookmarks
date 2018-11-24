function l(s) {console.log(s);}

function getActiveTab() {
    return browser.tabs.query({active: true, currentWindow: true});
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

function updateCurrent() {
    getActiveTab().then((tabs) => {
        var url = tabs[0].url;
        var title = document.getElementById("title");
        var episode = document.getElementById("episode");
        var data = extractTitleAndEpisodeNumber(url);
        if (data.title == null) {
            title.textContent = "unsupported URL!"; 
            showOperationPanel(false);
        } else {
            title.textContent = data.title;
            showOperationPanel(true);
        }

        if (data.episode) {
            episode.textContent = "ep: " + data.episode;
        }
        listTracked();
    });

}

function markPage(url) {
    const searching = browser.bookmarks.search({query: "animefreak"});
    searching.then((bookmarks) => {
        data = extractTitleAndEpisodeNumber(url);
        for (i=0; i<bookmarks.length; i++) {
            bookmark = bookmarks[i];
            if (isSameSeries(bookmark, url)) {
                browser.bookmarks.remove(bookmarks[i].id);
            }
        }
    });
    
    browser.bookmarks.create({
        id: 0,
        parentId: "prova",
        url: url
    });
}
function markThisPage() {
    getActiveTab().then((tabs) => {
        const url = tabs[0].url;
        markPage(url);
    });
}

document.getElementById("save").addEventListener("click", markThisPage);
updateCurrent();
