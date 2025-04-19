module debounce(
    input logic clk,
    input logic btn_in,
    output logic btn_out
);
    logic [15:0] counter;
    logic btn_sync, btn_sync_reg;

    // Two-stage synchronizer
    always_ff @(posedge clk) begin
        btn_sync_reg <= btn_in;
        btn_sync <= btn_sync_reg;
    end

    always_ff @(posedge clk) begin
        if (btn_out == btn_sync) begin
            counter <= 0;
        end else begin
            counter <= counter + 1;
            if (counter == 16'hFFFF) begin  // Around 650ms with 100MHz clock
                btn_out <= btn_sync;
            end
        end
    end
endmodule