
//  import KeyState from "../systems/game/SupEngine/src/Input.ts";

/*
interface KeyModifiers {
  shiftKey: boolean,
  ctlKey: boolean;
  altKey: boolean;
  shiftLeft: boolean;
  shiftRight: boolean;
  ctlLeft: boolean;
  ctlRight: boolean;
  altLeft: boolean;
  altRight: boolean;
}
*/
interface KeyDef {
  str: string;
  asc: number;
}
interface KeySet {
  meta: KeyDef;
  core: KeyDef;
}
interface KeyState {
  isDown: boolean;
  wasJustPressed: boolean;
  wasJustAutoRepeated: boolean;
  wasJustReleased: boolean;
}
export default class HotKeyMgr {

  keyEvent = {
    DOM_VK_NULL: 0,
    DOM_VK_CANCEL: 3,
    DOM_VK_HELP: 6,
    DOM_VK_BACK_SPACE: 8,
    DOM_VK_TAB: 9,
    DOM_VK_CLEAR: 12,
    DOM_VK_RETURN: 13,
    DOM_VK_ENTER: 14,
    DOM_VK_SHIFT: 16,
    DOM_VK_CONTROL: 17,
    DOM_VK_ALT: 18,
    DOM_VK_PAUSE: 19,
    DOM_VK_CAPS_LOCK: 20,
    DOM_VK_ESCAPE: 27,
    DOM_VK_SPACE: 32,
    DOM_VK_PAGE_UP: 33,
    DOM_VK_PAGE_DOWN: 34,
    DOM_VK_END: 35,
    DOM_VK_HOME: 36,
    DOM_VK_LEFT: 37,
    DOM_VK_UP: 38,
    DOM_VK_RIGHT: 39,
    DOM_VK_DOWN: 40,
    DOM_VK_PRINTSCREEN: 44,
    DOM_VK_INSERT: 45,
    DOM_VK_DELETE: 46,
    DOM_VK_0: 48,
    DOM_VK_1: 49,
    DOM_VK_2: 50,
    DOM_VK_3: 51,
    DOM_VK_4: 52,
    DOM_VK_5: 53,
    DOM_VK_6: 54,
    DOM_VK_7: 55,
    DOM_VK_8: 56,
    DOM_VK_9: 57,
    DOM_VK_SEMICOLON: 59,
    DOM_VK_EQUALS: 61,
    DOM_VK_A: 65,
    DOM_VK_B: 66,
    DOM_VK_C: 67,
    DOM_VK_D: 68,
    DOM_VK_E: 69,
    DOM_VK_F: 70,
    DOM_VK_G: 71,
    DOM_VK_H: 72,
    DOM_VK_I: 73,
    DOM_VK_J: 74,
    DOM_VK_K: 75,
    DOM_VK_L: 76,
    DOM_VK_M: 77,
    DOM_VK_N: 78,
    DOM_VK_O: 79,
    DOM_VK_P: 80,
    DOM_VK_Q: 81,
    DOM_VK_R: 82,
    DOM_VK_S: 83,
    DOM_VK_T: 84,
    DOM_VK_U: 85,
    DOM_VK_V: 86,
    DOM_VK_W: 87,
    DOM_VK_X: 88,
    DOM_VK_Y: 89,
    DOM_VK_Z: 90,
    DOM_VK_CONTEXT_MENU: 93,
    DOM_VK_NUMPAD0: 96,
    DOM_VK_NUMPAD1: 97,
    DOM_VK_NUMPAD2: 98,
    DOM_VK_NUMPAD3: 99,
    DOM_VK_NUMPAD4: 100,
    DOM_VK_NUMPAD5: 101,
    DOM_VK_NUMPAD6: 102,
    DOM_VK_NUMPAD7: 103,
    DOM_VK_NUMPAD8: 104,
    DOM_VK_NUMPAD9: 105,
    DOM_VK_MULTIPLY: 106,
    DOM_VK_ADD: 107,
    DOM_VK_SEPARATOR: 108,
    DOM_VK_SUBTRACT: 109,
    DOM_VK_DECIMAL: 110,
    DOM_VK_DIVIDE: 111,
    DOM_VK_F1: 112,
    DOM_VK_F2: 113,
    DOM_VK_F3: 114,
    DOM_VK_F4: 115,
    DOM_VK_F5: 116,
    DOM_VK_F6: 117,
    DOM_VK_F7: 118,
    DOM_VK_F8: 119,
    DOM_VK_F9: 120,
    DOM_VK_F10: 121,
    DOM_VK_F11: 122,
    DOM_VK_F12: 123,
    DOM_VK_F13: 124,
    DOM_VK_F14: 125,
    DOM_VK_F15: 126,
    DOM_VK_F16: 127,
    DOM_VK_F17: 128,
    DOM_VK_F18: 129,
    DOM_VK_F19: 130,
    DOM_VK_F20: 131,
    DOM_VK_F21: 132,
    DOM_VK_F22: 133,
    DOM_VK_F23: 134,
    DOM_VK_F24: 135,
    DOM_VK_NUM_LOCK: 144,
    DOM_VK_SCROLL_LOCK: 145,
    DOM_VK_COMMA: 188,
    DOM_VK_PERIOD: 190,
    DOM_VK_SLASH: 191,
    DOM_VK_BACK_QUOTE: 192,
    DOM_VK_OPEN_BRACKET: 219,
    DOM_VK_BACK_SLASH: 220,
    DOM_VK_CLOSE_BRACKET: 221,
    DOM_VK_QUOTE: 222,
    DOM_VK_META: 224,

    DOM_VK_SHIFT_LEFT: 256,
    DOM_VK_SHIFT_RIGHT: 257,
    DOM_VK_CONTROL_LEFT: 258,
    DOM_VK_CONTROL_RIGHT: 259,
    DOM_VK_ALT_LEFT: 260,
    DOM_VK_ALT_RIGHT: 261
  };


  private keyset: { [contextName: string]: any } = {};
  private uniq: { [contextName: string]: any } = {};

  constructor () {
    Object.freeze(this.keyEvent);
  }

  isModifier<T>(vkstring: string) {
    let rc = false;
    switch(vkstring) {
      case "DOM_VK_NULL":
      case "DOM_VK_ALT":
      case "DOM_VK_SHIFT":
      case "DOM_VK_CONTROL":
      case "DOM_VK_META":
      case "DOM_VK_ALT_LEFT":
      case "DOM_VK_SHIFT_LEFT":
      case "DOM_VK_CONTROL_LEFT":
      case "DOM_VK_ALT_RIGHT":
      case "DOM_VK_SHIFT_RIGHT":
      case "DOM_VK_CONTROL_RIGHT":
        rc = true;
        break;
    }
    return rc;
  }

  decGroup<T>(groupName: string): {ok: boolean, msg?: string} {
    if (groupName == null) {
      return {ok: false, msg: "missing groupName"};
    }
    if (typeof groupName !== "string") {
      return {ok: false, msg: "groupName must be string"};
    }
    if (this.keyset[groupName] == null) {
      this.keyset[groupName] = {};
      return {ok: true};
    } else {
      return {ok: false, msg: "groupName already declared"};
    }
  }
  decAction<T>(groupName: string, actionName: string): {ok: boolean, msg?: string} {
    if (groupName == null) {
        return {ok: false, msg: "missing groupName"};
    }
    if (this.keyset[groupName] == null) {
        return {ok: false, msg: "groupName " + groupName + " not declared"};
    }
    if (actionName == null) {
        return {ok: false, msg: "missing actionName"};
    }
    if (typeof actionName !== "string") {
        return {ok: false, msg: "actionName must be string"};
    }

    if (this.keyset[groupName][actionName] == null) {
        this.keyset[groupName][actionName] = {meta: {}, core: {}};
        return {ok: true};
    } else  {
        return {ok: false, msg: "actionName already declared"};
    }
  }
  seqKeySet<T>(groupName: string, actionName: string): {ok: boolean, msg?: string, str?: string} {
    if (groupName == null) {
      return {ok: false, msg: "missing groupName"};
    }
    if (this.keyset[groupName] == null) {
      return {ok: false, msg: "group " + groupName + " not declared" };
    }
    if (actionName == null) {
      return {ok: false, msg: "missing actionName" };
    }
    if (typeof actionName !== "string") {
      return {ok: false, msg: "actionName must be string" };
    }
    let ks = this.keyset[groupName][actionName];
    if (ks == null) {
      return {ok: false, msg: "action " + actionName + " not declared" };
    }
    if (ks.meta == null || ks.meta.str == null) {
      return {ok: false, msg: "action " + actionName + " not declared properly" };
    }
    if (ks.core == null || ks.meta.str == null) {
      return {ok: false, msg: "action " + actionName + " not declared properly" };
    }
    // todo:  validate str prop
    let str = ks.meta.str + "+" + ks.core.str;
    return {ok: true, str: str};

  }
  regKeySet<T>(groupName: string, actionName: string, keyModDef: string, keyCodeDef: string ): {ok: boolean, msg?: string} {
    if (groupName == null) {
      return {ok: false, msg: "missing groupName" };
    }
    if (this.keyset[groupName] == null) {
      return {ok: false, msg: "group " + groupName + " not declared" };
    }
    if (actionName == null) {
      return {ok: false, msg: "missing actionName" };
    }
    if (typeof actionName !== "string") {
      return {ok: false, msg: "actionName must be string" };
    }
    if (this.keyset[groupName][actionName] == null) {
      return {ok: false, msg: "action " + actionName + " not declared" };
    }
    if (this.keyset[groupName][actionName].meta == null) {
      return {ok: false, msg: "action " + actionName + " not declared properly" };
    }
    if (this.keyset[groupName][actionName].core == null) {
      return {ok: false, msg: "action " + actionName + " not declared properly" };
    }

    if (typeof keyModDef !== "string") {
      return {ok: false, msg: "keyModDef must be string" };
    }
    if (typeof (<any>this.keyEvent)[keyModDef] === "undefined") {
      return {ok: false, msg: "keyModDef not valid" };
    }

    if (typeof keyCodeDef !== "string") {
      return {ok: false, msg: "keyCodeDef must be string" };
    }
    if (typeof (<any>this.keyEvent)[keyCodeDef] === "undefined") {
      return {ok: false, msg: "keyCodeDef not valid" };
    }

    if (!this.isModifier(keyModDef)) {
      return {ok: false, msg: "keyModDef must be a modifier key or DOM_VK_NULL" };
    }
    if (this.isModifier(keyCodeDef) && keyCodeDef !== "DOM_VK_NULL") {
      return {ok: false, msg: "keyCodeDef cannot be a modifier key" };
    }

    let keySetStr = keyModDef + "+" + keyCodeDef;

    if (this.uniq[keySetStr] == null) {
      this.uniq[keySetStr] = {group: groupName, fcn: actionName};
    } else {
      return {ok: false, msg: "keyset [" + keySetStr + "] already assigned" };
    }

    let old = this.seqKeySet(groupName, actionName);
    if (old.ok) {
        if (this.uniq[old.str]) {
            delete this.uniq[old.str];
        }
    }

    let meta = { str: keyModDef,  asc: (<any>this.keyEvent)[keyModDef]  };
    let core = { str: keyCodeDef, asc: (<any>this.keyEvent)[keyCodeDef] };

    this.keyset[groupName][actionName].meta = meta;
    this.keyset[groupName][actionName].core = core;

    return {ok: true};
  }
  clrKeySet<T>(groupName: string, actionName: string ): {ok: boolean, msg?: string} {

    if (groupName == null) {
      return {ok: false, msg: "missing groupName" };
    }
    if (this.keyset[groupName] == null) {
      return {ok: false, msg: "group  [" + groupName + "] not registered" };
    }
    if (actionName == null) {
      return {ok: false, msg: "missing actionName" };
    }
    if (typeof actionName !== "string") {
      return {ok: false, msg: "actionName must be string" };
    }
    if (this.keyset[groupName][actionName] == null) {
      return {ok: false, msg: "action " + actionName + " not declared" };
    }

    let old = this.seqKeySet(groupName, actionName);
    if (old.ok) {
        if (this.uniq[old.str]) {
            delete this.uniq[old.str];
        }
    }

    this.keyset[groupName][actionName].meta = {};
    this.keyset[groupName][actionName].core = {};
    return {ok: true};
  }
  getKeySet<T>(groupName: string, actionName: string ): {ok: boolean, msg?: string, obj?: KeySet} {

    if (groupName == null) {
      return {ok: false, msg: "missing groupName" };
    }
    if (this.keyset[groupName] == null) {
      return {ok: false, msg: "group  [" + groupName + "] not registered" };
    }
    if (actionName == null) {
      return {ok: false, msg: "missing actionName" };
    }
    if (typeof actionName !== "string") {
      return {ok: false, msg: "actionName must be string" };
    }
    if (this.keyset[groupName][actionName] == null) {
      return {ok: false, msg: "action " + actionName + " not declared" };
    }

    let obj = this.keyset[groupName][actionName];
    return {ok: true, obj: obj};
  }
  //  IKBA:  Input.KeyboardButton.Array
  isKeySetActiveIKBA<T>(keySet: KeySet, ikbArr: KeyState[] ) {

    let ke: any = this.keyEvent;

    let meta: KeyDef = keySet.meta;
    let core: KeyDef = keySet.core;

    // simple test of both keymodifer and keycode in Input.KeyboardButton.Array[].isDown

    if (meta.asc !== ke.DOM_VK_NULL) {
        if (ikbArr[meta.asc].isDown && ikbArr[core.asc].isDown) {
            return true;
        }
    }

    // test when kmStr = "DOM_VK_NULL"

    if ( ikbArr[ke.DOM_VK_ALT].isDown || ikbArr[ke.DOM_VK_CONTROL].isDown ||
         ikbArr[ke.DOM_VK_SHIFT].isDown || ikbArr[ke.DOM_VK_META].isDown
        ) {
        return false;
    }
    if (ikbArr[core.asc].isDown) {
        return true;
    }

    return false;
  }
}

