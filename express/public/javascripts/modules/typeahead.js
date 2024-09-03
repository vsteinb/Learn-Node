import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(recipes) {
    return recipes
        .map(recipe =>
            `<a href="/recipe/${recipe.slug}" class="search__result">
                <strong>${recipe.name}</strong>
            </a>`
        )
        .join('');
}

function typeAhead(search) {
    if (!search) return;

// const search = document.querySelector(".search")
    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');
    
    // handle typeahead on search
    searchInput.on('input', function() {
        if (!this.value) {
            return searchResults.style.display = 'none';
        }
        searchResults.style.display = 'block';
        searchResults.innerHTML = '';
        
        axios
            .get(`/api/v1/searchRecipes?q=${this.value}`)
            .then(res => {
                if (!res.data.length) {
                    return searchResults.innerHTML = `<div class="search__result search__result--info">
                        Keine Treffer für ${dompurify.sanitize(this.value)}
                    </div>`;
                }
                searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
            })
            .catch(err => console.error(err));  // TODO maybe Sentry?
    });
    
    
    // handle keyboard inputs on suggestions
    searchInput.on('keyup', function(e) {
        const activeClass = 'search__result--active';
        
        let highlightedOption = searchResults.querySelector(`.${activeClass}`);
        highlightedOption?.classList.remove(activeClass);

        switch (e.keyCode) {
            // arrow up
            case 38: highlightedOption = highlightedOption?.previousElementSibling || searchResults.lastElementChild; break;
            // arrow down
            case 40: highlightedOption = highlightedOption?.nextElementSibling || searchResults.firstElementChild; break;
            // enter
            case 13: highlightedOption?.click(); break;
        
            // do nothing
            default: break;
        }
        if (highlightedOption?.classList.contains('search__result--info')) return;

        highlightedOption?.classList.add(activeClass);
    });
}


export default typeAhead;