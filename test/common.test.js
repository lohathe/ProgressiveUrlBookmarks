function test_fake_success() {
    return {
        outcome: true,
        description: "should be true",
        details: "always return true!"
    };
}

function test_fake_fail() {
    return {
        outcome: false,
        description: "should be false",
        details: "always return false!"
    };
}

function test_extract_data_with_rule_from_url_generic(description, rule, url, expected_title, expected_episode) {
    let res = extractDataWithRuleFromURL(rule, url);
    success = res.title == expected_title;
    success &= res.episode == expected_episode;
    details = `RULE: '${rule}'\nURL: '${url}'\nTITLE: ${res.title} (expected: ${expected_title})\nEPISODE: ${res.episode} (expected: ${expected_episode})`
    return {
        outcome: success,
        description: description,
        details: details,
    };
    //return [success, description];
}

function test_extract_data_with_rule_from_url_1() {
    return test_extract_data_with_rule_from_url_generic(
        "Just match the title name when the 'rule' contains only the title.",
        "https://my.stream.site/<title>",
        "https://my.stream.site/THE_TITLE",
        "THE_TITLE",
        null);
}

function test_extract_data_with_rule_from_url_2() {
    return test_extract_data_with_rule_from_url_generic(
        "Just match the title in case the URL is a valid prefix of the 'rule'.",
        "https://my.stream.site/<title>",
        "https://my.stream.site/THE_TITLE/other/data",
        "THE_TITLE",
        null);
}

function test_extract_data_with_rule_from_url_3() {
    return test_extract_data_with_rule_from_url_generic(
        "Just match the title in case the 'rule' is a valid prefix of the URL.",
        "https://my.stream.site/<title>/<episode>",
        "https://my.stream.site/THE_TITLE",
        "THE_TITLE",
        null);
}

function test_extract_data_with_rule_from_url_4() {
    return test_extract_data_with_rule_from_url_generic(
        "Match both title and episode if URL is a valid prefix of 'rule'. Title and episode are separated by '/'.",
        "https://my.stream.site/<title>/<episode>",
        "https://my.stream.site/THE_TITLE/other/data",
        "THE_TITLE",
        "other");
}

function test_extract_data_with_rule_from_url_5() {
    return test_extract_data_with_rule_from_url_generic(
        "Correctly match both title and episode discarding prefix and suffix.",
        "https://my.stream.site/prefix-<title>-suffix/prefix-<episode>-suffix",
        "https://my.stream.site/prefix-THE_TITLE-suffix/prefix-123-suffix",
        "THE_TITLE",
        "123");
}

function test_extract_data_with_rule_from_url_6() {
    return test_extract_data_with_rule_from_url_generic(
        "Match both title and episode when they are separed by several '/'.",
        "https://my.stream.site/<title>/other/<episode>",
        "https://my.stream.site/THE_TITLE/other/data",
        "THE_TITLE",
        "data");
}

function test_extract_data_with_rule_from_url_7() {
    return test_extract_data_with_rule_from_url_generic(
        "Match both title and episode when they are separed by several '/'. Their relative order is not significant: what is important is the order inside the 'rule'.",
        "https://my.stream.site/<episode>/other/<title>",
        "https://my.stream.site/AAA/other/BBB",
        "BBB",
        "AAA");
}

function test_extract_data_with_rule_from_url_8() {
    return test_extract_data_with_rule_from_url_generic(
        "Match the title even if the episode does not match correctly.",
        "https://my.stream.site/<title>/prefix-<episode>-suffix",
        "https://my.stream.site/THE_TITLE/bad-prefix-123-suffix",
        "THE_TITLE",
        null);
}

function test_extract_data_with_rule_from_url_9() {
    return test_extract_data_with_rule_from_url_generic(
        "Match nothing if only the episode matches correctly.",
        "https://my.stream.site/prefix-<title>/<episode>",
        "https://my.stream.site/bad-prefix-THE_TITLE/123",
        null,
        null);
}

function test_extract_data_with_rule_from_url_10() {
    return test_extract_data_with_rule_from_url_generic(
        "Match title and episode without qualms about their actual content.",
        "https://my.stream.site/<title>/prefix-<episode>-suffix",
        "https://my.stream.site/THE_TITLE/prefix-123-bad-suffix",
        "THE_TITLE",
        "123-bad");
}

function test_extract_data_with_rule_from_url_11() {
    return test_extract_data_with_rule_from_url_generic(
        "Match nothing if URL is similar to 'rule' but the site prefix is wrong.",
        "https://my.stream.site/<title>/prefix-<episode>-suffix",
        "https://my.other.stream.site/THE_TITLE/prefix-123-suffix",
        null,
        null);
}

function test_extract_data_with_rule_from_url_12() {
    return test_extract_data_with_rule_from_url_generic(
        "Match title and episode even when they are not separated by `/`.",
        "https://my.stream.site/watch/<title>-episode-<episode>",
        "https://my.stream.site/watch/THE_TITLE-episode-123",
        "THE_TITLE",
        "123");
}

function test_extract_data_with_rule_from_url_13() {
    return test_extract_data_with_rule_from_url_generic(
        "Title and episode must be separated by at least a character otherwise they are mismatched.",
        "https://my.stream.site/watch/<title><episode>",
        "https://my.stream.site/watch/THE_TITLE-123",
        "THE_TITLE-123",
        "");
}
