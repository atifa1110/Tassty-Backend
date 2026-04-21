export const FormatHelper = {
    /**
     * Mengubah array of options menjadi string rapi untuk disimpan di DB/History
     * Format: "Nama Group: Nama Option"
     */
    formatSelectedOptions: (selectedOptions) => {
        if (!selectedOptions || selectedOptions.length === 0) return null;

        const grouped = selectedOptions.reduce((acc, opt) => {
            const groupName = opt.customization_groups?.group_name || "-";

            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(opt.option_name);
            return acc;
        }, {});

        return Object.entries(grouped)
        .map(([groupName, options]) => {
            return `${groupName}: ${options.join(', ')}`;
        })
        .join('\n');
    }
};