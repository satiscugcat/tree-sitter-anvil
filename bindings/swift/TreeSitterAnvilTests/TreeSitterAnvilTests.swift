import XCTest
import SwiftTreeSitter
import TreeSitterAnvil

final class TreeSitterAnvilTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_anvil())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Anvil grammar")
    }
}
