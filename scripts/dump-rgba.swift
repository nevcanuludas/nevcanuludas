// Dumps a PNG as raw RGBA bytes: swift dump-rgba.swift in.png out.rgba  (prints "W H")
import CoreGraphics
import Foundation
import ImageIO

let args = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let w = img.width, h = img.height
var data = [UInt8](repeating: 0, count: w * h * 4)
let ctx = CGContext(
  data: &data, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
  space: CGColorSpaceCreateDeviceRGB(),
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
try! Data(data).write(to: URL(fileURLWithPath: args[2]))
print(w, h)
