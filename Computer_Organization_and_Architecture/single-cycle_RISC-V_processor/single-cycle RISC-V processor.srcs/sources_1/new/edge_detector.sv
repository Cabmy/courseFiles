module edge_detector(
    input logic clk,
    input logic signal_in,
    output logic pulse
);
    logic signal_delayed;

    always_ff @(posedge clk) begin
        signal_delayed <= signal_in;
    end

    // This generates a pulse for one clock cycle when signal_in transitions from 0 to 1
    assign pulse = signal_in & ~signal_delayed;
endmodule