const messageDictionary = {
    de: require("./messages/messages.de.json"),
    en: require("./messages/messages.en.json"),
    it: require("./messages/messages.it.json"),
    pt: require("./messages/messages.pt.json"),
    tr: require("./messages/messages.tr.json"),
    uk: require("./messages/messages.uk.json"),
    el: require("./messages/messages.el.json"),
};

const get = (identifier) => {
    // Special case for Greek toolbar - if Greek is the first language in config but not a main language
    if (global.config.languages && global.config.languages[0] === "el") {
        return (
            messageDictionary["el"][identifier] ||
            messageDictionary[global.getLocale()][identifier]
        );
    }
    return messageDictionary[global.getLocale()][identifier];
};

module.exports = {
    get: get,
};
