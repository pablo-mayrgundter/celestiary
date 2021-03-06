const elt = (id) => { return document.getElementById(id); }


function assertNotNullOrUndefined(x) {
  try {
    if (x == null) {
      throw 'Variable may not be null';
    }
    if (x == undefined) {
      throw 'Variable may not be undefined';
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}


function assertArgs(args, length) {
  let i;
  try {
    if (args.length != length) {
      throw `Not enough arguments; expected ${length} got ${args.length}`;
    }
    for (i = 0; i < args.length; i++) {
      assertNotNullOrUndefined(args[i]);
    }
  } catch (e) {
    if (i == undefined) {
      console.error(e);
    } else {
      console.error(`Arg ${i}: ${e}`)
    }
    throw e;
  }
}


function named(obj, name) {
  if (!(typeof name == 'string' && name.length > 0)) {
    throw new Error('Name must be provided');
  }
  obj.name = name;
  return obj;
}


function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.substring(1);
}

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.style = 'border: solid 1px red; display: none';
  document.body.appendChild(canvas);
  return canvas;
}

function measureText(ctx, text, fontStyle) {
  if (fontStyle) {
    ctx.font = fontStyle;
  }
  const m = ctx.measureText(text);
  const width = Math.ceil(m.width);
  const height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
  //console.log(`text: ${text}, width: ${width}, height: ${height}`, m);
  return {width, height};
}


/**
 * Recursively visit child members of {@param elt}'s "children" property.
 * @param cb1 The pre-order callback.  Called with the current element.
 * @param cb2 The in-order callback.  Called with the parent and current element.
 * @param cb3 The post-order callback.  Called with the current element.
 * @param level is incremented on the way down recursivey and probably
 * should not be set by caller, but will be passed to the callbacks to
 * allow indent formatting.
 */
function visit(elt, cb1, cb2, cb3, level) {
  level = level || 1;
  if (cb1) {
    cb1(elt, level);
  }
  if (elt.children) {
    for (let ndx in elt.children) {
      const child = elt.children[ndx];
      if (cb2) {
        cb2(elt, child, level);
      }
      visit(child, cb1, cb2, cb3, level + 1);
    }
  }
  if (cb3) {
    cb3(elt, level);
  }
}


/** Preorder visit. */
function visitFilterProperty(elt, propName, propValue, cb) {
  visit(elt, child => {
      if (child.hasOwnProperty(propName) && child[propName] == propValue) {
        cb(child);
      }
    })
}


/** Preorder visit. */
function visitToggleProperty(elt, filterPropName, filterPropValue, togglePropName) {
  visitFilterProperty(elt, filterPropName, filterPropValue, child => {
      if (!(child.hasOwnProperty(togglePropName) && typeof child[togglePropName] == 'boolean')) {
        throw new Error(`Found child invalid toggle property(${togglePropName}):`, child);
      }
      child[togglePropName] = !child[togglePropName];
    });
}


// https://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}


export {
  capitalize,
  createCanvas,
  elt,
  assertNotNullOrUndefined,
  assertArgs,
  measureText,
  named,
  toArrayBuffer,
  visit,
  visitFilterProperty,
  visitToggleProperty
};
