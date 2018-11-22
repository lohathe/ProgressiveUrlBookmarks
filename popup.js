function getActiveTab() {
    return browser.tabs.query({active: true, currentWindow: true});
}

function titleMatchesURL(title, url) {
    return url.search(title) != -1;
}

function l(s) {console.log(s);}

function isSameSeries(bookmark, current_url) {
    current_url_data = extractTitleAndEpisodeNumber(current_url);
    if (!current_url_data.title || !current_url_data.episode) {
        // should never fall here since `current_url` should be a valid url!
        l("BAD1");
        return false;
    }
    bookmark_data = extractTitleAndEpisodeNumber(bookmark.url);
    if (!bookmark_data.episode) {
        l(`bookmark ${bookmark.title} is not an episode`);
        // pay attention to remove only url matching an episode
        return false;
    }
    isSame = bookmark_data.title == current_url_data.title;
    l(`${bookmark_data.title} == ${current_url_data.title} -> ${isSame}`);
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
        console.log(`found page to mark: ${data.title}`);
        for (i=0; i<bookmarks.length; i++) {
            bookmark = bookmarks[i];
            console.log(`found bookmark ${bookmark.url}`);
            //if (titleMatchesURL(bookmark.url, data.title)) {
            if (isSameSeries(bookmark, url)) {
                console.log("removing bookmark");
                browser.bookmarks.remove(bookmarks[i].id);
            }
        }
    });
    
    console.log("DDDD");
    browser.bookmarks.create({
        id: 0,
        parentId: "prova",
        url: url
    });
    console.log("EEEE");
}
function markThisPage() {
    getActiveTab().then((tabs) => {
        const url = tabs[0].url;
        console.log(`calling markPage(${url})`);
        markPage(url);
    });
}

//document.addEventListener("DOMContentLoaded", function (event) {
//    document.getElementById("save").addEventListener(markThisPage);
//});

document.getElementById("save").addEventListener("click", markThisPage);
updateCurrent();
console.log("END SCRIPT");
