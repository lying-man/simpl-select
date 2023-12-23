//utils
function getEl(selector: string, from?: HTMLElement):HTMLElement {
    if (from) {
        return from.querySelector(selector) as HTMLElement;
    }
    return document.querySelector(selector) as HTMLElement;
}

//interfaces
interface ISelectItem {
    id: number,
    value: string,
    text: string
}

type TypeSelectList = ISelectItem[];

interface IOptions {
    selector: string,
    data: TypeSelectList,
    imagePath: string,
    cb: (selectOption: ISelectItem) => any, 
    animation?: TypeAnimationSelect,
    theme?: TypeTheme,
    selectedIndex?: number,
    placeholder?: string,
}

interface ISelectCallbacks {
    showSelect: () => void,
    hideSelect: () => void,
    deleteSelect: () => void,
    getActiveOption: () => ISelectItem | null,
    addSelectOption: (item: ISelectItem) => void,
    deleteSelectOption: (id: number) => void,
    setActiveOption: (id: number) => void
}

type fnProps<T> = undefined | T;
type TypeVisivility = "show" | "hide";
type TypeTheme = "dark" | "light";
type TypeAnimationSelect = "default" | "opacity" | "slide" | "scale";

//code
function generateCustomSelect(options: IOptions): ISelectCallbacks {

    //validations
    if (!options.data.length) throw new Error("Incorrect data prop");

    let idList: number[] = options.data.map(el => el.id);
    if ( idList.length !== Array.from(new Set(idList)).length ) throw new Error("Incorrect id values (not_unique)");

    let initialSelectedElementId: number | null = null;
    if (options.selectedIndex) {
        let element = options.data.filter(el => el.id === options.selectedIndex);
        if (!element.length) throw new Error("Incorrect selctedIndex prop");
        initialSelectedElementId = element[0].id;
    }
    
    //select initialization
    const { data, selectedIndex, imagePath, placeholder, cb, theme, animation } = options;

    const placeEl = document.querySelector(options.selector);
    
    //validation selector
    if (!placeEl) throw new Error("Incorrect selector prop");

    const selectElement = document.createElement("div");
    selectElement.className = "custom-select";
    selectElement.classList.add(theme || "light");
    selectElement.classList.add(animation || "default");
    selectElement.setAttribute("data-select", String(Date.now()));

    const selectMarkup = generateMarkup(data, placeholder, imagePath);
    selectElement.innerHTML = selectMarkup;

    //select parts
    const selectItems: HTMLElement[] = [ ...selectElement.querySelectorAll(".custom-select-body-item") as any ];
    const selectTitle = getEl(".custom-select-header-title", selectElement);
    const selectHeader = getEl(".custom-select-header", selectElement);
    const selectItemsBox = getEl(".custom-select-body", selectElement);
    selectItemsBox.classList.add(animation || "default");

    (placeEl as HTMLElement).append(selectElement);
    if (initialSelectedElementId) setActiveOption(initialSelectedElementId); 

    let isSelectOpen: boolean = false;
    let activeSelectOption: ISelectItem | null = selectedIndex ? data[selectedIndex] : null; 

    //for keyboard controls
    const selectFocusList: HTMLElement[] = [ selectHeader, ...selectItems ];
    let lastSelectFocusIndex: number = selectFocusList.length - 1;
    let indexSelectFocusList: number = 0;

    //handlers
    function toggleSelect(status: TypeVisivility):void {
        if (status === "show") {
            isSelectOpen = true;
            selectElement.classList.add("show");
        } else {
            isSelectOpen = false;
            indexSelectFocusList = 0;
            selectElement.classList.remove("show");
        }
    }

    function setActiveOption(id: number):void {

        const selectedOption = data.filter(el => el.id === id)[0];

        if (selectedOption) {
            for (let item of selectItems) {
                let isPressed = Number(item.dataset.id) === selectedOption.id;
                isPressed ? item.classList.add("active") : item.classList.remove("active");
            }

            selectTitle.textContent = selectedOption.text;
            activeSelectOption = selectedOption;

            toggleSelect("hide");
            selectItems.forEach(el => el.blur());
            selectHeader.focus();
            cb(selectedOption);
        }

    }

    function addSelectOption(item: ISelectItem):void {

        let duble = customFindIndex<ISelectItem>(data, (dataItem) => dataItem.id === item.id);
        if (duble !== null) throw new Error("Passed id prop must be unique");
        
        let el = document.createElement("button");
        el.classList.add("custom-select-body-item");
        el.setAttribute("data-id", String(item.id));
        el.setAttribute("tabindex", "-1");
        el.textContent = item.text;
        selectItemsBox.append(el);
        
        console.log(Array.isArray(selectItems));
        selectItems.push(el as HTMLElement);
        data.push(item);
        selectFocusList.push(el);
        lastSelectFocusIndex++;

    }

    function deleteSelectOption(id: number):void {

        if (data.length === 1) throw new Error("Options select list not can be empty");

        let findedIndex = customFindIndex<ISelectItem>(data, (dataItem) => dataItem.id === id);
        if (!findedIndex) throw new Error("Not found id in the select option list");

        let findedIndexFocusList = customFindIndex<HTMLElement>(selectFocusList, (el) => Number(el.dataset.id) === id);
        if (findedIndexFocusList) selectFocusList.splice(findedIndexFocusList, 1);

        selectItems[findedIndex].remove();
        selectItems.splice(findedIndex, 1);
        data.splice(findedIndex, 1);
        lastSelectFocusIndex--;

    }

    const getActiveOption = ():ISelectItem | null => activeSelectOption;

    const deleteSelect = ():void => {
        selectElement.removeEventListener("click", handlerSelectClick);
        document.documentElement.removeEventListener("click", handlerSelectClose);
        document.documentElement.removeEventListener("keydown", handlerSelectKey);
        selectElement.remove();
    }

    const showSelect = ():void => toggleSelect("show");
    const hideSelect = ():void => toggleSelect("hide");

    //handlers
    function handlerSelectKey(e: KeyboardEvent):void {

        if (isSelectOpen) {

            let code = e.code;

            if (code === "ArrowUp") {
                indexSelectFocusList = indexSelectFocusList ? indexSelectFocusList - 1 : lastSelectFocusIndex;
                selectFocusList[indexSelectFocusList].focus();
                return;
            }

            if (code === "ArrowDown") {
                indexSelectFocusList = indexSelectFocusList === lastSelectFocusIndex ? 0 : indexSelectFocusList + 1;
                selectFocusList[indexSelectFocusList].focus();
                return;
            }

        }

    }

    function handlerSelectClose(e: MouseEvent):void {

        if (isSelectOpen) {
            let target = e.target as HTMLElement;
            let pressedEl = target.closest(".custom-select");

            if (pressedEl) {
                if ((pressedEl as HTMLElement).dataset.select !== selectElement.dataset.select) toggleSelect("hide");
            } else {
                toggleSelect("hide");
            }
        }

    }

    function handlerSelectClick(e: MouseEvent):void {

        const target = e.target as HTMLElement;

        let pressedHeaderSelect = target.closest(".custom-select-header");
        if (pressedHeaderSelect) {
            toggleSelect(isSelectOpen ? "hide" : "show");
            return;
        }

        let pressedSelectOption = target.matches(".custom-select-body-item");
        if (pressedSelectOption) {
            let chooseId = Number(target.dataset.id);
            setActiveOption(chooseId);
        }

    }

    //setup handlers
    selectElement.addEventListener("click", handlerSelectClick);
    document.documentElement.addEventListener("click", handlerSelectClose);
    document.documentElement.addEventListener("keydown", handlerSelectKey);

    return { showSelect, hideSelect, deleteSelect, getActiveOption, addSelectOption, deleteSelectOption, setActiveOption };

}

function generateMarkup(data: TypeSelectList, placeholder: fnProps<string>, imagePath: string):string {

    let headerSelectContent = `
        <button class="custom-select-header">
            <div class="custom-select-header-title">${ getInitialSelectTitle(placeholder) }</div>
            <img class="custom-select-header-img" src="${imagePath}" alt="стрелка">
        </button>
    `;

    let values = data.map(el => `<button tabindex="-1" data-id="${el.id}" class="custom-select-body-item">${el.text}</button>`);

    let bodySelectContent = ` <div class="custom-select-body">${ values.join("") }</div> `;

    return `${headerSelectContent}\n${bodySelectContent}`;

}

function getInitialSelectTitle(placeholder: fnProps<string>):string {
    if (placeholder && placeholder.trim()) return placeholder;
    return "Выберите значение";
}

function customFindIndex <T>(list: T[], cb: (el: T) => boolean):number | null {
    let index = 0;
    while (index < list.length) {
        let result = cb(list[index]);
        if (result) return index;
        index++;
    }
    return null;
}

export { generateCustomSelect, IOptions, ISelectCallbacks };