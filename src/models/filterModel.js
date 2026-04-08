import { supabaseAdmin } from '../config/supabaseClient.js'

export const FilterModel = {
  
  async getSortOptions() {
        const { data, error } = await supabaseAdmin
            .from('filter_sort_options')
            .select('id, filter_label'); 

        if (error) throw new Error('Failed to fetch sort options: ' + error.message);

        // Map id -> key
        return data.map(d => ({ 
            key: d.id, 
            label: d.filter_label 
        }));
  },

  async getRatingOptions() {
        // Mengambil dari tabel filter_ratings
        const { data, error } = await supabaseAdmin
            .from('filter_ratings')
            .select('id, filter_label'); 

        if (error) throw new Error('Failed to fetch rating options: ' + error.message);
        
        // Map id -> key
        return data.map(d => ({ 
            key: d.id, 
            label: d.filter_label 
        }));
  },

  async getPriceOptions() {
        const { data, error } = await supabaseAdmin
            .from('filter_price_ranges')
            .select('id, filter_label');

        if (error) throw new Error('Failed to fetch price options: ' + error.message);
        
        // Map id -> key
        return data.map(d => ({ 
            key: d.id, 
            label: d.filter_label 
        }));
  },

  async getCuisineOptions() {
        const { data, error } = await supabaseAdmin
            .from('restaurant_categories')
            .select('id, name'); // Hanya ambil kolom yang dibutuhkan

        if (error) throw new Error('Failed to fetch sort options: ' + error.message);

        // Map id -> key
        return data.map(d => ({ 
            key: d.id, 
            label: d.name
        }));
    },

  async getModeOptions() {
        const { data, error } = await supabaseAdmin
            .from('filter_service_modes')
            .select('id, filter_label'); // Hanya ambil kolom yang dibutuhkan

        if (error) throw new Error('Failed to fetch sort options: ' + error.message);

        // Map id -> key
        return data.map(d => ({ 
            key: d.id, 
            label: d.filter_label 
        }));
    },


    async getAllFilterMetadata() {
        // Panggil semua fungsi di atas secara paralel (lebih cepat)
        const [
            sort_options,
            rating_options,
            price_range_options,
            cuisine_options,
            mode_options
        ] = await Promise.all([
            this.getSortOptions(),
            this.getRatingOptions(),
            this.getPriceOptions(),
            this.getCuisineOptions(),
            this.getModeOptions()
        ]);

        return {
            sort_options,
            rating_options,
            price_range_options,
            cuisine_options,
            mode_options
        };
    }
  
}