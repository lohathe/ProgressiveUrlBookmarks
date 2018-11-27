function saveOptions(e) {
    browser.storage.sync.set({
        bookmarks_folder: document.querySelector("#PUB_bookmarks_folder").value
    });
    e.preventDefault();
}

function restoreOptions() {
    var storageItem = browser.storage.sync.get("bookmarks_folder");
    storageItem.then((res) => {
        document.querySelector("#the-folder").innerText = res.bookmarks_folder || "PUB_bookmarks_folder (default)";
        document.querySelector("#PUB_bookmarks_folder").value = res.bookmarks_folder;
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#PUB_bookmarks_folder_selector").addEventListener("submit", saveOptions);
