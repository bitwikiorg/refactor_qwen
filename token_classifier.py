def classify_tokens(user_input):
    """
    Classifies tokens in the user input.
    Args:
        user_input (str): The input string from the user.
    Returns:
        dict: A dictionary with token classifications.
    """
    # Example: Simple token classification logic
    tokens = user_input.split()
    classifications = {token: "keyword" if token.isalpha() else "number" for token in tokens}
    return classifications
