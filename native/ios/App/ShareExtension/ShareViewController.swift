/**
 * ShareViewController.swift — Klip4ge iOS Share Extension
 * ─────────────────────────────────────────────────────────
 * Appears as "Save to Klip4ge" in the iOS Share Sheet.
 *
 * FLOW:
 *   1. User taps Share → Save to Klip4ge
 *   2. This ViewController runs (in extension process, NOT the main app)
 *   3. Extracts URL + title from the share context
 *   4. Saves intent to App Group shared UserDefaults
 *   5. Opens main app via klip4ge:// URL scheme
 *   6. Dismisses extension
 *
 * SETUP IN XCODE:
 *   File → New → Target → Share Extension
 *   Bundle ID: app.klip4ge.app.ShareExtension
 *   App Group: group.app.klip4ge.app  (must match App.entitlements)
 *
 * BUILD NOTE:
 *   This file requires:
 *     - iOS 14.0+
 *     - Social.framework
 *     - MobileCoreServices.framework
 */

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {

    // ── App Group key for sharing data with main app ────────────────────────
    private let APP_GROUP      = "group.app.klip4ge.app"
    private let PENDING_INTENT = "klip4ge_pending_share_intent"
    private let APP_SCHEME     = "klip4ge"

    // ── SLComposeServiceViewController overrides ────────────────────────────

    override func isContentValid() -> Bool {
        // Always valid — we handle whatever URL or text is shared
        return true
    }

    override func didSelectPost() {
        // Extract the shared content
        extractSharedContent { [weak self] url, title, text in
            guard let self = self else { return }

            let intent: [String: String] = [
                "url":    url    ?? "",
                "title":  title  ?? "",
                "text":   text   ?? "",
                "source": "ios_share",
            ]

            // Save to App Group shared container
            if let sharedDefaults = UserDefaults(suiteName: self.APP_GROUP) {
                if let data = try? JSONSerialization.data(withJSONObject: intent) {
                    sharedDefaults.set(data, forKey: self.PENDING_INTENT)
                    sharedDefaults.synchronize()
                }
            }

            // Build deep link to open main app
            var components    = URLComponents()
            components.scheme = self.APP_SCHEME
            components.host   = "share"
            components.queryItems = [
                URLQueryItem(name: "url",    value: url    ?? ""),
                URLQueryItem(name: "title",  value: title  ?? ""),
                URLQueryItem(name: "source", value: "ios_share"),
            ]

            if let deepLink = components.url {
                // Open the main Klip4ge app
                // Note: In an extension, we must use openURL via the responder chain
                var responder: UIResponder? = self
                while responder != nil {
                    if let application = responder as? UIApplication {
                        application.open(deepLink, options: [:], completionHandler: nil)
                        break
                    }
                    responder = responder?.next
                }
            }

            // Dismiss the extension
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }

    override func configurationItems() -> [Any]! {
        // No extra configuration UI — instant save on tap
        return []
    }

    // ── Extract shared URL / text from extension context ───────────────────

    private func extractSharedContent(completion: @escaping (String?, String?, String?) -> Void) {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            completion(nil, nil, nil)
            return
        }

        var sharedURL:   String?
        var sharedTitle: String?
        var sharedText:  String?

        let group = DispatchGroup()

        for item in extensionItems {
            // Title from item's attribution
            sharedTitle = sharedTitle ?? item.attributedTitle?.string

            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // ── Try to get a URL ─────────────────────────────────────────
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { (urlItem, _) in
                        defer { group.leave() }
                        if let url = urlItem as? URL {
                            sharedURL = sharedURL ?? url.absoluteString
                        } else if let urlStr = urlItem as? String {
                            sharedURL = sharedURL ?? urlStr
                        }
                    }
                }

                // ── Try to get plain text (might be a URL string) ────────────
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { (textItem, _) in
                        defer { group.leave() }
                        if let text = textItem as? String {
                            // If it looks like a URL, treat it as one
                            if text.hasPrefix("http://") || text.hasPrefix("https://") {
                                sharedURL = sharedURL ?? text
                            } else {
                                sharedText = sharedText ?? text
                            }
                        }
                    }
                }

                // ── Try web page URL ─────────────────────────────────────────
                if attachment.hasItemConformingToTypeIdentifier("public.url") {
                    group.enter()
                    attachment.loadItem(forTypeIdentifier: "public.url") { (urlItem, _) in
                        defer { group.leave() }
                        if let url = urlItem as? URL {
                            sharedURL = sharedURL ?? url.absoluteString
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) {
            completion(sharedURL, sharedTitle, sharedText)
        }
    }
}
