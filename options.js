const DEFAULT_BOOKMARKS_FOLDER = "PUB_playground";

function saveBookmarksFolder(e) {
    input_value = document.querySelector("#PUB_bookmarks_folder").value | DEFAULT_BOOKMARKS_FOLDER;
    browser.storage.sync.set({
        bookmarks_folder: input_value
    });
    e.preventDefault();
}
    e.preventDefault();
}

function restoreOptions() {
    var storageItem = browser.storage.sync.get("bookmarks_folder");
    storageItem.then((res) => {
        document.querySelector("#the-folder").innerText = res.bookmarks_folder || "PUB_playground";
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#PUB_bookmarks_folder_selector").addEventListener("submit", saveBookmarksFolder);
