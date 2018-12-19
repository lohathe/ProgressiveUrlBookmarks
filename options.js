// BOOKMARKS FOLDER
function saveBookmarksFolder(e) {
    e.preventDefault();
    input_value = document.querySelector("#PUB_bookmarks_folder").value;
    if (!input_value) {
        throw new Error("invalid input for PUB_bookmarks_folder");
    }
    return updateBookmarksFolder(input_value);
}

function updateBookmarksFolder(new_folder) {
    return browser.storage.sync.set({
        bookmarks_folder: new_folder,
    })
    .then((ignore) => {
        return restoreOptions();
    })
    .then((ignore) => {
        return clearAllInputs();
    })
}

function restoreBookmarksFolder(folder_name) {
    document.querySelector("#the-folder").innerText = folder_name;
}

function clearBookmarksFolderInput() {
    document.querySelector("#PUB_bookmarks_folder").value = null;
}

// WHOLE PAGE MANAGEMENT
function restoreOptions() {
    return getBookmarksFolderName()
        .then(restoreBookmarksFolder);
}

function clearAllInputs() {
    return clearBookmarksFolderInput();
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#PUB_bookmarks_folder_selector").addEventListener("submit", saveBookmarksFolder);
