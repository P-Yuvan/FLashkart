async function runAIChat(messages, context) {
  const lastMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';

  // Extract context data
  const hasCart = context.includes('Cart (');
  const cartEmpty = context.includes('Cart is empty');
  const added = context.match(/Added "(.+?)" \(₹([\d]+)\) to cart/);
  const removed = context.match(/Successfully removed "(.+?)" from cart/);
  const products = [];
  const productLines = context.match(/\d+\. .+ — ₹[\d]+.*/g) || [];
  productLines.forEach(line => products.push(line));
  const budgetExceeded = context.includes('exceeds');
  const cartMatch = context.match(/Cart \((\d+) items, subtotal ₹([\d.]+)/);

  // Added to cart
  if (added) {
    return `✅ Done! Added **${added[1]}** (₹${added[2]}) to your cart.${budgetExceeded ? '\n\n⚠️ Heads up — your cart total is exceeding your budget!' : ''}\n\nWant to keep shopping or go to checkout? 🛒`;
  }

  // Removed from cart
  if (removed) {
    return `🗑️ Removed **${removed[1]}** from your cart.\n\nAnything else I can help with?`;
  }

  // Cart view
  if (cartEmpty) {
    return `Your cart is empty! 🛒\n\nWant me to suggest some products? Just tell me what you're looking for — clothing, electronics, groceries, or anything else!`;
  }

  if (hasCart && cartMatch) {
    return `Here's your cart summary 🛒\n\n${context.match(/• .+/g)?.join('\n') || ''}\n\n**Subtotal: ₹${cartMatch[2]}**${budgetExceeded ? '\n\n⚠️ This exceeds your budget!' : ''}\n\nReady to checkout?`;
  }

  // Products found
  if (products.length > 0) {
    return `Here's what I found for you 🛍️\n\n${products.join('\n')}\n\nWant me to add any of these to your cart? Just say "add [item name]"!`;
  }

  // No products found
  if (context.includes('No matching') || context.includes('No products found')) {
    return `Sorry, I couldn't find anything matching that. 😕\n\nTry searching for:\n• Clothing (shirts, jeans, kurtas)\n• Footwear (sneakers, sandals)\n• Electronics (headphones, chargers)\n• Grocery (snacks, beverages)\n• Home (pillows, decor)`;
  }

  // Outfit context
  if (context.includes('outfit') || context.includes('Outfit')) {
    return `Here's a great outfit suggestion for you 👗👟\n\n${products.join('\n')}\n\nThese pieces go really well together! Want me to add any to your cart?`;
  }

  // Greetings
  if (/hi|hello|hey|hola|namaste/i.test(lastMsg)) {
    return `Hey there! 👋 I'm FlashCart AI, your personal shopping assistant!\n\nI can help you:\n🔍 Find products\n🛒 Add items to cart\n👗 Build outfits\n💰 Find deals under your budget\n\nWhat are you shopping for today?`;
  }

  // Help
  if (/help|what can you do|how|guide/i.test(lastMsg)) {
    return `Here's what I can do for you 😊\n\n🔍 **Find products** — "Show me shirts under ₹500"\n🛒 **Add to cart** — "Add Nike sneakers to cart"\n🗑️ **Remove items** — "Remove the shirt from cart"\n👗 **Outfit ideas** — "Suggest a formal outfit"\n💰 **Budget deals** — "Show deals under ₹1000"\n📦 **View cart** — "What's in my cart?"\n\nJust ask away!`;
  }

  // Default
  return `I'm here to help you shop smarter! 🛍️\n\nTry asking me:\n• "Show me products under ₹500"\n• "Add a t-shirt to my cart"\n• "Suggest a casual outfit"\n• "What's in my cart?"\n\nWhat are you looking for today?`;
}

module.exports = { runAIChat };
