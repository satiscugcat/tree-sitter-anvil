package tree_sitter_anvil_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_anvil "github.com/tree-sitter/tree-sitter-anvil/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_anvil.Language())
	if language == nil {
		t.Errorf("Error loading Anvil grammar")
	}
}
